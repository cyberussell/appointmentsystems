import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Business } from './types'
import { formatSlotLabel, isNextDayInTz } from './slots'
import { hasFeature } from './entitlements'
import { sendText } from './messenger'
import { logEvent } from './events'
import { logError } from './errors'

interface DueAppointment {
  id: string
  starts_at: string
  reference_code: string | null
  clients: { messenger_psid: string | null } | null
  services: { name: string } | null
  staff: { name: string } | null
  businesses: Pick<Business, 'id' | 'name' | 'address' | 'timezone' | 'plan_tier' | 'plan_status'> | null
}

// Sends the day-before Messenger reminder promised in the booking
// confirmation. Runs once a day from the Vercel cron (see vercel.json), so
// "due" means the appointment falls on tomorrow's calendar date in the
// business's own timezone. Only clients reachable on Messenger (a PSID on
// file) can be reminded; reminder_sent_at makes re-runs idempotent and is
// reset whenever an appointment is rescheduled.
export async function sendDueReminders(
  db: SupabaseClient,
  now: Date = new Date()
): Promise<{ sent: number; failed: number; skipped: number }> {
  const horizon = new Date(now.getTime() + 48 * 3600_000)
  const { data, error } = await db
    .from('appointments')
    .select(
      'id, starts_at, reference_code, clients(messenger_psid), services(name), staff(name), businesses(id, name, address, timezone, plan_tier, plan_status)'
    )
    .in('status', ['pending', 'confirmed'])
    .is('reminder_sent_at', null)
    .gt('starts_at', now.toISOString())
    .lt('starts_at', horizon.toISOString())
  if (error) throw error

  const due = ((data ?? []) as unknown as DueAppointment[]).filter(
    (a) =>
      a.businesses &&
      a.clients?.messenger_psid &&
      a.businesses.plan_status !== 'suspended' &&
      hasFeature(a.businesses, 'messenger_reminders') &&
      isNextDayInTz(a.starts_at, now, a.businesses.timezone)
  )
  const skipped = (data?.length ?? 0) - due.length
  if (due.length === 0) return { sent: 0, failed: 0, skipped }

  const businessIds = [...new Set(due.map((a) => a.businesses!.id))]
  const { data: secrets } = await db
    .from('business_secrets')
    .select('business_id, fb_page_token')
    .in('business_id', businessIds)
  const tokenByBusiness = new Map((secrets ?? []).map((s) => [s.business_id as string, s.fb_page_token as string | null]))

  let sent = 0
  let failed = 0
  for (const appt of due) {
    const business = appt.businesses!
    const pageToken = tokenByBusiness.get(business.id)
    if (!pageToken) {
      failed++
      continue
    }
    try {
      const label = formatSlotLabel(appt.starts_at, business.timezone)
      const manage = appt.reference_code
        ? `\n\nReference code: ${appt.reference_code}\nPara mag-cancel o mag-reschedule: https://www.cyberussell.com/appointments/manage/${appt.reference_code}`
        : ''
      // CONFIRMED_EVENT_UPDATE lets a reminder go out after Messenger's
      // 24-hour standard messaging window has closed.
      const ok = await sendText(
        pageToken,
        appt.clients!.messenger_psid!,
        `Reminder po! ⏰ Bukas na po ang appointment ninyo:\n\n🗓️ ${label}\n💼 ${appt.services?.name ?? 'Appointment'}\n🧑‍⚕️ with ${appt.staff?.name ?? 'our staff'}\n📍 ${business.name}${business.address ? `, ${business.address}` : ''}${manage}\n\nSee you po! 🙏`,
        'CONFIRMED_EVENT_UPDATE'
      )
      if (!ok) {
        failed++
        await logEvent(db, business.id, 'reminder_failed', { appointment_id: appt.id })
        continue
      }
      await db
        .from('appointments')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', appt.id)
        .is('reminder_sent_at', null)
      await logEvent(db, business.id, 'reminder_sent', { appointment_id: appt.id, channel: 'messenger' })
      sent++
    } catch (err) {
      failed++
      await logError(db, business.id, 'sendDueReminders', err)
    }
  }
  return { sent, failed, skipped }
}
