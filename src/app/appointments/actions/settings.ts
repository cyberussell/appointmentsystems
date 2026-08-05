'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { createServerSupabase, createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import { requireBusiness, requireBusinessAccess } from '@/lib/appointment-system/auth'
import { logEvent } from '@/lib/appointment-system/events'
import { hasFeature } from '@/lib/appointment-system/entitlements'
import { businessPageCacheTag } from '@/lib/appointment-system/cacheTags'
import { DAY_KEYS, type BusinessHours } from '@/lib/appointment-system/types'
import type { ActionResult } from './types'

const updateBusinessProfileSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().catch(''),
  address: z.string().trim().catch(''),
})

export async function updateBusinessProfile(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness()
  const parsed = updateBusinessProfileSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    address: formData.get('address'),
  })
  if (!parsed.success) return
  const { name, phone, address } = parsed.data
  await supabase.from('businesses').update({ name, phone, address }).eq('id', business.id)
  revalidatePath('/appointments/dashboard/settings')
  // The public booking page's data is cached via unstable_cache (60s) —
  // name/address/phone shown there shouldn't wait on the timer.
  updateTag(businessPageCacheTag(business.slug))
}

// Temporarily-closed notice: pauses Messenger + web booking with a message.
export async function updateClosedNotice(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness()
  const closed = formData.get('closed') === 'on'
  const message = String(formData.get('closed_message') ?? '').trim().slice(0, 300)
  await supabase
    .from('businesses')
    .update({ settings: { ...business.settings, closed, closed_message: message } })
    .eq('id', business.id)
  revalidatePath('/appointments/dashboard/settings')
  revalidatePath('/appointments/dashboard')
  // Most time-sensitive of the public-page revalidations — an owner marking
  // themselves closed shouldn't wait up to 60s to take effect.
  updateTag(businessPageCacheTag(business.slug))
}

// Manually hides the dashboard's setup checklist even if not all steps are done.
export async function dismissSetupChecklist(): Promise<void> {
  const { supabase, business } = await requireBusiness()
  await supabase
    .from('businesses')
    .update({ settings: { ...business.settings, setup_checklist_hidden: true } })
    .eq('id', business.id)
  revalidatePath('/appointments/dashboard')
}

export async function dismissDowngradeNotice(): Promise<void> {
  const { supabase, business } = await requireBusiness()
  const settings = { ...business.settings } as Record<string, unknown>
  delete settings.downgrade_notice
  await supabase.from('businesses').update({ settings }).eq('id', business.id)
  revalidatePath('/appointments/dashboard')
}

// Business-wide operating hours — gates whether the business accepts any
// online bookings at all. Does not constrain per-staff Availability.
export async function updateBusinessHours(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness()
  const hours: BusinessHours = DAY_KEYS.map((key) => {
    if (formData.get(`${key}_open`) !== 'on') return null
    const open = String(formData.get(`${key}_start`) ?? '')
    const close = String(formData.get(`${key}_end`) ?? '')
    if (!/^\d{2}:\d{2}$/.test(open) || !/^\d{2}:\d{2}$/.test(close) || open >= close) return null
    return { open, close }
  })
  await supabase
    .from('businesses')
    .update({ settings: { ...business.settings, hours } })
    .eq('id', business.id)
  revalidatePath('/appointments/dashboard/settings')
  updateTag(businessPageCacheTag(business.slug))
}

const changePasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match.', path: ['confirm'] })

export async function changePassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse({ password: formData.get('password'), confirm: formData.get('confirm') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid password.' }
  const { password } = parsed.data
  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  return { error: 'DONE' } // rendered as success in the UI
}

const updateClientNotesSchema = z.object({
  id: z.string().uuid(),
  notes: z
    .string()
    .catch('')
    .transform((v) => v.slice(0, 2000)),
})

export async function updateClientNotes(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, business } = await requireBusinessAccess()
  const parsed = updateClientNotesSchema.safeParse({ id: formData.get('id'), notes: formData.get('notes') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Could not save notes.' }
  const { id, notes } = parsed.data
  const { error } = await supabase.from('clients').update({ notes }).eq('id', id).eq('business_id', business.id)
  if (error) return { error: 'Could not save notes — please try again.' }
  revalidatePath(`/appointments/dashboard/clients/${id}`)
  revalidatePath('/appointments/dashboard/clients')
  revalidatePath(`/appointments/staff/dashboard/clients/${id}`)
  return { error: 'DONE' } // rendered as success in the UI
}

// Facebook Page connection. v1: owner pastes Page ID + Page Access Token from
// the Meta developer console (dev-mode testers). OAuth flow comes with app review.
const saveFbConnectionSchema = z.object({
  fb_page_id: z.string().trim().min(1),
  fb_page_token: z.string().trim().min(1),
})

export async function saveFbConnection(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness()
  if (!hasFeature(business, 'messenger_booking_bot')) return
  const parsed = saveFbConnectionSchema.safeParse({
    fb_page_id: formData.get('fb_page_id'),
    fb_page_token: formData.get('fb_page_token'),
  })
  if (!parsed.success) return
  const { fb_page_id: pageId, fb_page_token: pageToken } = parsed.data

  const { error } = await supabase.from('businesses').update({ fb_page_id: pageId }).eq('id', business.id)
  if (error) return

  // Token goes into the service-role-only table.
  const admin = createAdminSupabase()
  await admin
    .from('business_secrets')
    .upsert({ business_id: business.id, fb_page_token: pageToken, updated_at: new Date().toISOString() })
  await logEvent(admin, business.id, 'fb_page_connected', { page_id: pageId })
  revalidatePath('/appointments/dashboard/settings')
}
