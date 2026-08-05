'use server'

import { revalidatePath } from 'next/cache'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import { logEvent } from '@/lib/appointment-system/events'

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
    .select('id, business_id, status, services(duration_min)')
    .eq('reference_code', code)
    .maybeSingle()
  if (!appt) return { error: 'Booking not found.' }
  if (appt.status === 'cancelled' || appt.status === 'completed') {
    return { error: 'This booking can no longer be rescheduled.' }
  }
  const duration = (appt.services as { duration_min?: number } | null)?.duration_min
  if (!duration) return { error: 'Could not determine service duration.' }

  const startsAt = new Date(startsAtIso)
  const endsAt = new Date(startsAt.getTime() + duration * 60_000)
  const { error } = await db
    .from('appointments')
    .update({
      staff_id: staffId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: 'confirmed',
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
