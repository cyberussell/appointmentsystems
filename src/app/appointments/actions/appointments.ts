'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import { requireBusinessAccess } from '@/lib/appointment-system/auth'
import { logEvent } from '@/lib/appointment-system/events'
import { bookAppointment, wallTimeToUtc } from '@/lib/appointment-system/slots'
import { canCreateAppointment, PLANS } from '@/lib/appointment-system/entitlements'
import type { ActionResult } from './types'

export async function updateAppointmentStatus(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusinessAccess()
  const id = String(formData.get('id'))
  const status = String(formData.get('status'))
  if (!['confirmed', 'completed', 'cancelled', 'no_show'].includes(status)) return
  await supabase.from('appointments').update({ status }).eq('id', id).eq('business_id', business.id)
  const admin = createAdminSupabase()
  await logEvent(admin, business.id, `appointment_${status}`, { appointment_id: id })
  revalidatePath('/appointments/dashboard')
  revalidatePath('/appointments/dashboard/appointments')
}

const createManualAppointmentSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().catch(''),
  service_id: z.string().uuid(),
  staff_id: z.string().uuid(),
  starts_at: z.string().min(1),
  note: z.string().trim().catch(''),
})

export async function createManualAppointment(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, business } = await requireBusinessAccess()
  const parsed = createManualAppointmentSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    service_id: formData.get('service_id'),
    staff_id: formData.get('staff_id'),
    starts_at: formData.get('starts_at'),
    note: formData.get('note'),
  })
  if (!parsed.success) return { error: 'Please fill in name, service, staff, and date/time.' }
  const { fullName, phone, service_id: serviceId, staff_id: staffId, starts_at: when, note } = parsed.data

  const startsAt = wallTimeToUtc(when, business.timezone)
  if (!startsAt) return { error: 'Invalid date/time.' }

  const quota = await canCreateAppointment(supabase, business)
  if (!quota.allowed) {
    return {
      error: `You've reached your monthly limit of ${quota.limit} appointments on the ${PLANS[business.plan_tier].name} plan. Upgrade to accept more bookings.`,
    }
  }

  const result = await bookAppointment(supabase, {
    businessId: business.id,
    serviceId,
    staffId,
    startsAt: startsAt.toISOString(),
    client: { fullName, phone },
    source: 'manual',
    intakeNote: note,
  })
  if (!result.ok) {
    return {
      error:
        result.reason === 'conflict'
          ? 'That staff member already has an appointment at that time.'
          : result.message,
    }
  }
  const admin = createAdminSupabase()
  await logEvent(admin, business.id, 'booking_created', {
    appointment_id: result.appointmentId,
    source: 'manual',
  })
  revalidatePath('/appointments/dashboard/appointments')
  revalidatePath('/appointments/dashboard')
  return {}
}

const rescheduleAppointmentSchema = z.object({
  id: z.string().uuid(),
  starts_at: z.string().min(1),
})

export async function rescheduleAppointment(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { supabase, business } = await requireBusinessAccess()
  const parsed = rescheduleAppointmentSchema.safeParse({ id: formData.get('id'), starts_at: formData.get('starts_at') })
  if (!parsed.success) return { error: 'Invalid date/time.' }
  const { id, starts_at: when } = parsed.data

  const startsAt = wallTimeToUtc(when, business.timezone)
  if (!startsAt) return { error: 'Invalid date/time.' }

  const { data: appt } = await supabase
    .from('appointments')
    .select('id, services(duration_min)')
    .eq('id', id)
    .eq('business_id', business.id)
    .single()
  const duration = (appt?.services as { duration_min?: number } | null)?.duration_min
  if (!appt || !duration) return { error: 'Appointment not found.' }

  const endsAt = new Date(startsAt.getTime() + duration * 60_000)
  const { error } = await supabase
    .from('appointments')
    .update({ starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), status: 'confirmed' })
    .eq('id', id)
    .eq('business_id', business.id)
  if (error) {
    return {
      error:
        error.code === '23P01'
          ? 'That staff member already has an appointment at that time.'
          : error.message,
    }
  }
  const admin = createAdminSupabase()
  await logEvent(admin, business.id, 'appointment_rescheduled', { appointment_id: id })
  revalidatePath('/appointments/dashboard/appointments')
  revalidatePath('/appointments/dashboard')
  return {}
}

const recordPaymentAmountSchema = z.object({
  id: z.string().uuid(),
  amount: z.coerce.number().finite().min(0),
})
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export async function recordPayment(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, business } = await requireBusinessAccess()
  const parsedAmount = recordPaymentAmountSchema.safeParse({ id: formData.get('id'), amount: formData.get('amount') })
  if (!parsedAmount.success) return { error: 'Enter a valid amount.' }
  const { id, amount } = parsedAmount.data
  const parsedDate = dateOnlySchema.safeParse(formData.get('paid_date'))
  if (!parsedDate.success) return { error: 'Enter a valid date.' }
  const dateStr = parsedDate.data
  // Midday business time keeps the date stable across timezones.
  const paidAt = wallTimeToUtc(`${dateStr}T12:00`, business.timezone)
  if (!paidAt) return { error: 'Enter a valid date.' }

  const { error } = await supabase
    .from('appointments')
    .update({
      amount_paid: amount,
      paid_at: amount > 0 ? paidAt.toISOString() : null,
    })
    .eq('id', id)
    .eq('business_id', business.id)
  if (error) return { error: error.message }

  const admin = createAdminSupabase()
  await logEvent(admin, business.id, 'payment_recorded', { appointment_id: id, amount })
  revalidatePath('/appointments/dashboard')
  revalidatePath('/appointments/dashboard/appointments')
  revalidatePath('/appointments/dashboard/clients')
  return {}
}
