'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createServerSupabase, createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import { logEvent } from '@/lib/appointment-system/events'
import { checkRateLimit, clientIp } from '@/lib/appointment-system/rateLimit'
import type { ActionResult } from './types'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

const signUpSchema = z.object({
  fullName: z.string().min(2).max(80),
  businessName: z.string().min(2).max(80),
  businessTypes: z.array(z.enum(['medical', 'dental', 'spa', 'salon', 'law', 'veterinary', 'other'])).min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ip = clientIp(await headers())
  if (!(await checkRateLimit(`signup:${ip}`, 5))) {
    return { error: 'Too many signup attempts — please wait a minute and try again.' }
  }

  const parsed = signUpSchema.safeParse({
    fullName: formData.get('fullName'),
    businessName: formData.get('businessName'),
    businessTypes: formData.getAll('businessTypes'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Please fill in all fields (password: 8+ characters) and pick at least one business type.' }
  const { fullName, businessName, businessTypes, email, password } = parsed.data

  const planRaw = formData.get('plan')
  const selectedPlanTier = planRaw === 'free' || planRaw === 'basic' || planRaw === 'pro' ? planRaw : null

  const supabase = await createServerSupabase()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) return { error: error.message }
  if (!data.user) return { error: 'Signup failed — please try again.' }

  // Supabase returns a fake user (empty identities) instead of an error when
  // the email is already registered, to prevent account enumeration.
  if (data.user.identities && data.user.identities.length === 0) {
    return { error: 'An account with this email already exists — please log in instead.' }
  }

  // Business row is created with the service role so signup works even when
  // email confirmation is enabled (no session yet → RLS would block it).
  const admin = createAdminSupabase()
  let slug = slugify(businessName)
  if (slug.length < 3) slug = `business-${slug}`
  const { count } = await admin.from('businesses').select('id', { count: 'exact', head: true }).eq('slug', slug)
  if (count && count > 0) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  const { error: businessError } = await admin
    .from('businesses')
    .insert({ owner_id: data.user.id, name: businessName, slug, business_types: businessTypes, selected_plan_tier: selectedPlanTier })
  if (businessError) return { error: businessError.message }

  await logEvent(admin, null, 'business_signed_up', { business_name: businessName, slug })

  if (!data.session) {
    return { error: 'CONFIRM_EMAIL' } // handled as info, not error, in the UI
  }
  redirect('/appointments/dashboard')
}

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ip = clientIp(await headers())
  if (!(await checkRateLimit(`login:${ip}`, 10))) {
    return { error: 'Too many login attempts — please wait a minute and try again.' }
  }

  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.code === 'email_not_confirmed') return { error: 'EMAIL_NOT_CONFIRMED' } // handled as info, not error, in the UI
    return { error: 'Invalid email or password.' }
  }

  // First login is always routed to Today (the setup checklist lives there) — a
  // business shouldn't be pushed toward payment before it can even take a booking.
  // selected_plan_tier still gets surfaced as a nudge in the checklist itself.
  const admin = createAdminSupabase()
  const { data: business } = await admin
    .from('businesses')
    .select('id, first_login_at')
    .eq('owner_id', data.user.id)
    .maybeSingle()

  if (business) {
    if (!business.first_login_at) {
      await admin.from('businesses').update({ first_login_at: new Date().toISOString() }).eq('id', business.id)
    }
    redirect('/appointments/dashboard')
  }

  // Not an owner — check for an active staff login before falling back.
  const { data: staff } = await admin
    .from('staff')
    .select('id')
    .eq('profile_id', data.user.id)
    .eq('active', true)
    .maybeSingle()
  if (staff) redirect('/appointments/staff/dashboard')

  redirect('/appointments/dashboard')
}

// Called directly from the login page via useTransition (not through useActionState/a
// <form> action) — it lives on the same form as signIn, and two useActionState hooks
// bound to one <form> unreliably route to the wrong action on submit.
export async function resendConfirmation(email: string): Promise<ActionResult> {
  const trimmed = email.trim()
  if (!trimmed) return { error: 'Enter your email above first, then resend.' }
  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.resend({ type: 'signup', email: trimmed })
  if (error) return { error: 'Could not resend — please try again in a moment.' }
  return {}
}

const requestPasswordResetSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email address.'),
})

export async function requestPasswordReset(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Enter your email address.' }
  const { email } = parsed.data
  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://www.cyberussell.com/appointments/reset-password',
  })
  if (error) return { error: 'Could not send reset link — please try again in a moment.' }
  return { error: 'SENT' } // handled as info, not error, in the UI
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/appointments/login')
}
