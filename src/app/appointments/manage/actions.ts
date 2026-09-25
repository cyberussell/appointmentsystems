'use server'

import { revalidatePath } from 'next/cache'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import { logEvent } from '@/lib/appointment-system/events'
import { getAvailableSlots, hasConfiguredHours } from '@/lib/appointment-system/slots'
import type { Business } from '@/lib/appointment-system/types'

export interface ManageActionResult {
  error?: string
  success?: boolean
}

// These are unauthenticated by design — the reference code itself is the
// access credential, same pattern as most consumer booking systems.

export async function cancelBookingByCode(code: string): Promise<ManageActionResult> {
  const db = createAdminSupabase()
  const { data: appt } = await db
    .from('appointments')
    .select('id, business_id, status')
    .eq('reference_code', code)
    .maybeSingle()
  if (!appt) return { error: 'Booking not found.' }
  if (appt.status === 'cancelled') return { error: 'This booking is already cancelled.' }
  if (appt.status === 'completed') return { error: 'This booking is already completed.' }

  const { error } = await db.from('appointments').update({ status: 'cancelled' }).eq('id', appt.id)
  if (error) return { error: error.message }

  await logEvent(db, appt.business_id, 'booking_cancelled_by_client', { appointment_id: appt.id })
  revalidatePath(`/appointments/manage/${code}`)
  return { success: true }
}

export async function rescheduleBookingByCode(
  code: string,
  staffId: string,
  startsAtIso: string
): Promise<ManageActionResult> {
  const db = createAdminSupabase()
  const { data: appt } = await db
    .from('appointments')
    .select('id, business_id, service_id, status, services(duration_min)')
    .eq('reference_code', code)
    .maybeSingle()
  if (!appt) return { error: 'Booking not found.' }
  if (appt.status === 'cancelled' || appt.status === 'completed') {
    return { error: 'This booking can no longer be rescheduled.' }
  }
  const duration = (appt.services as { duration_min?: number } | null)?.duration_min
  if (!duration) return { error: 'Could not determine service duration.' }

  const { data: business } = await db.from('businesses').select('*').eq('id', appt.business_id).maybeSingle()
  if (!business || (business as Business).plan_status === 'suspended') return { error: 'Booking not found.' }
  const settings = (business as Business).settings as { closed?: boolean; closed_message?: string }
  if (settings.closed) {
    return { error: settings.closed_message || 'The business is temporarily closed.' }
  }
  if (!hasConfiguredHours(business as Business)) {
    return { error: 'This business is not accepting online bookings right now.' }
  }

  // The staff id and start time come straight from the browser, so only
  // accept a pairing the slot engine itself would offer for this booking's
  // service: that one check covers staff belonging to this business, being
  // active, being eligible for the service, working hours, breaks, blocked
  // dates, lead time and the 7-day window. Same parameters as GET /api/book,
  // which is where the manage page gets its choices from.
  const startsAt = new Date(startsAtIso)
  if (Number.isNaN(startsAt.getTime())) return { error: 'Invalid date/time.' }
  const slots = await getAvailableSlots(db, {
    businessId: appt.business_id,
    timezone: (business as Business).timezone,
    serviceId: appt.service_id,
    days: 7,
    limit: 500,
  })
  const offered = slots.some((s) => s.staffId === staffId && new Date(s.startsAt).getTime() === startsAt.getTime())
  if (!offered) return { error: 'That time is no longer available — please pick another.' }

  const endsAt = new Date(startsAt.getTime() + duration * 60_000)
  const { error } = await db
    .from('appointments')
    .update({
      staff_id: staffId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'confirmed',
      reminder_sent_at: null,
    })
    .eq('id', appt.id)

  if (error) {
    return {
      error: error.code === '23P01' ? 'That slot was just taken — please pick another.' : error.message,
    }
  }

  await logEvent(db, appt.business_id, 'booking_rescheduled_by_client', { appointment_id: appt.id })
  revalidatePath(`/appointments/manage/${code}`)
  return { success: true }
}
