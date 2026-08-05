'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import { requireBusiness } from '@/lib/appointment-system/auth'
import { logEvent } from '@/lib/appointment-system/events'
import { canAddProvider, PLANS } from '@/lib/appointment-system/entitlements'
import type { ActionResult } from './types'

const createStaffSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.'),
  title: z.string().trim().catch(''),
})

export async function createStaff(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, business } = await requireBusiness()
  const parsed = createStaffSchema.safeParse({ name: formData.get('name'), title: formData.get('title') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Enter a name.' }
  const { name, title } = parsed.data

  const seats = await canAddProvider(supabase, business)
  if (!seats.allowed) {
    return {
      error: `You've reached your limit of ${seats.limit} staff login${seats.limit === 1 ? '' : 's'} on the ${PLANS[business.plan_tier].name} plan. Upgrade to add more.`,
    }
  }

  const { error } = await supabase.from('staff').insert({ business_id: business.id, name, title })
  if (error) return { error: error.message }
  revalidatePath('/appointments/dashboard/staff')
  return {}
}

// Lets a staff member log in for themselves — separate from creating the
// staff row (name/title), since the email isn't always known up front.
const inviteStaffLoginSchema = z.object({
  staff_id: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
})

export async function inviteStaffLogin(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, business } = await requireBusiness()
  const parsed = inviteStaffLoginSchema.safeParse({ staff_id: formData.get('staff_id'), email: formData.get('email') })
  if (!parsed.success) return { error: 'Enter a valid email address.' }
  const { staff_id: staffId, email } = parsed.data

  const { data: staffRow } = await supabase
    .from('staff')
    .select('id, profile_id')
    .eq('id', staffId)
    .eq('business_id', business.id)
    .maybeSingle()
  if (!staffRow) return { error: 'Staff member not found.' }
  if (staffRow.profile_id) return { error: 'This staff member already has a login.' }

  const admin = createAdminSupabase()
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: 'https://www.cyberussell.com/appointments/staff/accept-invite',
    data: { business_name: business.name },
  })
  if (error || !invited.user) {
    return {
      error: error?.message.toLowerCase().includes('already')
        ? 'That email already has an account — ask them to use a different address.'
        : 'Could not send the invite — please try again.',
    }
  }

  const { error: updateError } = await admin
    .from('staff')
    .update({ profile_id: invited.user.id, invite_email: email, invited_at: new Date().toISOString() })
    .eq('id', staffId)
  if (updateError) return { error: updateError.message }

  await logEvent(admin, business.id, 'staff_invited', { staff_id: staffId, email })
  revalidatePath('/appointments/dashboard/staff')
  return {}
}

// Re-sends the invite email to the same address on file — the staff row's
// profile_id is set at invite time (not acceptance time), so it can't tell us
// whether the invite was ever actually accepted; inviteUserByEmail is safe to
// call again regardless; Supabase rejects it once the user has confirmed.
export async function resendStaffInvite(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { business } = await requireBusiness()
  const parsed = z.object({ staff_id: z.string().uuid() }).safeParse({ staff_id: formData.get('staff_id') })
  if (!parsed.success) return { error: 'Staff member not found.' }
  const { staff_id: staffId } = parsed.data

  const admin = createAdminSupabase()
  const { data: staffRow } = await admin
    .from('staff')
    .select('id, invite_email')
    .eq('id', staffId)
    .eq('business_id', business.id)
    .maybeSingle()
  if (!staffRow?.invite_email) return { error: 'This staff member has not been invited yet.' }

  const { error } = await admin.auth.admin.inviteUserByEmail(staffRow.invite_email, {
    redirectTo: 'https://www.cyberussell.com/appointments/staff/accept-invite',
    data: { business_name: business.name },
  })
  if (error) {
    return {
      error: error.message.toLowerCase().includes('already been registered')
        ? 'This staff member has already logged in — resending isn’t needed.'
        : 'Could not resend the invite — please try again.',
    }
  }

  await admin.from('staff').update({ invited_at: new Date().toISOString() }).eq('id', staffId)
  await logEvent(admin, business.id, 'staff_invite_resent', { staff_id: staffId, email: staffRow.invite_email })
  revalidatePath('/appointments/dashboard/staff')
  return {}
}

export async function toggleStaff(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness()
  const id = String(formData.get('id'))
  const active = formData.get('active') === 'true'
  await supabase.from('staff').update({ active: !active }).eq('id', id).eq('business_id', business.id)
  revalidatePath('/appointments/dashboard/staff')
}

export async function deleteStaff(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness()
  await supabase.from('staff').delete().eq('id', String(formData.get('id'))).eq('business_id', business.id)
  revalidatePath('/appointments/dashboard/staff')
}
