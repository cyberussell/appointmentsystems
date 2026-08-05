import type { SupabaseClient } from '@supabase/supabase-js'
import type { Availability, AvailabilityBreak, BlockedDate, Business, BusinessHours, Service, Slot, Staff } from './types'

/** True once the business has set at least one day of operating hours — gates whether it accepts any bookings at all. */
export function hasConfiguredHours(business: Pick<Business, 'settings'>): boolean {
  const hours = (business.settings as { hours?: BusinessHours }).hours
  return Array.isArray(hours) && hours.some((d) => d !== null)
}

// Minutes of lead time required before a slot can be booked.
const MIN_LEAD_MINUTES = 30

function tzOffsetMs(timeZone: string, utcDate: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(utcDate)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    map.hour === '24' ? 0 : Number(map.hour),
    Number(map.minute),
    Number(map.second)
  )
  return asUtc - utcDate.getTime()
}

// Convert a wall-clock time in the business's timezone to a UTC Date.
function zonedToUtc(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  timeZone: string
): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm))
  return new Date(guess.getTime() - tzOffsetMs(timeZone, guess))
}

function dateInTz(date: Date, timeZone: string): { y: number; m: number; d: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return {
    y: Number(map.year),
    m: Number(map.month),
    d: Number(map.day),
    weekday: weekdays.indexOf(map.weekday),
  }
}

// Convert a datetime-local value ("2026-07-06T14:00") entered as business wall
// time into a UTC Date.
export function wallTimeToUtc(value: string, timeZone: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return null
  return zonedToUtc(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]), timeZone)
}

export function formatSlotLabel(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

interface SlotQuery {
  businessId: string
  timezone: string
  serviceId: string
  days?: number
  limit?: number
}

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Generate open slots: staff weekly availability minus breaks, blocked dates,
// and booked appointments.
export async function getAvailableSlots(
  db: SupabaseClient,
  { businessId, timezone, serviceId, days = 7, limit = 30 }: SlotQuery
): Promise<Slot[]> {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + days * 86400_000)

  const [svcRes, staffRes, availRes, breaksRes, blockedRes, apptRes] = await Promise.all([
    db.from('services').select('*').eq('id', serviceId).single(),
    db.from('staff').select('*').eq('business_id', businessId).eq('active', true),
    db.from('availability').select('*').eq('business_id', businessId),
    db.from('availability_breaks').select('*').eq('business_id', businessId),
    db
      .from('blocked_dates')
      .select('*')
      .eq('business_id', businessId)
      .gte('date', dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate()))
      .lte('date', dateKey(windowEnd.getFullYear(), windowEnd.getMonth() + 1, windowEnd.getDate())),
    db
      .from('appointments')
      .select('staff_id, starts_at, ends_at')
      .eq('business_id', businessId)
      .in('status', ['pending', 'confirmed'])
      .gte('ends_at', now.toISOString())
      .lte('starts_at', windowEnd.toISOString()),
  ])

  const service = svcRes.data as Service | null
  if (!service) return []
  const staff = (staffRes.data ?? []) as Staff[]
  const availability = (availRes.data ?? []) as Availability[]
  const breaks = (breaksRes.data ?? []) as AvailabilityBreak[]
  const blockedDates = (blockedRes.data ?? []) as BlockedDate[]
  const booked = (apptRes.data ?? []) as { staff_id: string; starts_at: string; ends_at: string }[]

  const staffById = new Map(staff.map((s) => [s.id, s]))
  const durationMs = service.duration_min * 60_000
  const earliest = now.getTime() + MIN_LEAD_MINUTES * 60_000
  const slots: Slot[] = []

  for (let dayOffset = 0; dayOffset <= days; dayOffset++) {
    const day = new Date(now.getTime() + dayOffset * 86400_000)
    const { y, m, d, weekday } = dateInTz(day, timezone)
    const key = dateKey(y, m, d)
    const businessClosedToday = blockedDates.some((b) => b.staff_id === null && b.date === key)
    if (businessClosedToday) continue

    for (const window of availability) {
      if (window.day_of_week !== weekday) continue
      const member = staffById.get(window.staff_id)
      if (!member) continue
      if (blockedDates.some((b) => b.staff_id === member.id && b.date === key)) continue

      const [sh, sm] = window.start_time.split(':').map(Number)
      const [eh, em] = window.end_time.split(':').map(Number)
      const windowStart = zonedToUtc(y, m, d, sh, sm, timezone).getTime()
      const windowClose = zonedToUtc(y, m, d, eh, em, timezone).getTime()

      const dayBreaks = breaks
        .filter((b) => b.staff_id === member.id && b.day_of_week === weekday)
        .map((b) => {
          const [bsh, bsm] = b.start_time.split(':').map(Number)
          const [beh, bem] = b.end_time.split(':').map(Number)
          return {
            start: zonedToUtc(y, m, d, bsh, bsm, timezone).getTime(),
            end: zonedToUtc(y, m, d, beh, bem, timezone).getTime(),
          }
        })

      for (let t = windowStart; t + durationMs <= windowClose; t += durationMs) {
        if (t < earliest) continue
        const tEnd = t + durationMs
        const onBreak = dayBreaks.some((b) => t < b.end && tEnd > b.start)
        if (onBreak) continue
        const clash = booked.some(
          (b) =>
            b.staff_id === member.id &&
            t < new Date(b.ends_at).getTime() &&
            tEnd > new Date(b.starts_at).getTime()
        )
        if (clash) continue
        const startsAt = new Date(t).toISOString()
        slots.push({
          startsAt,
          endsAt: new Date(tEnd).toISOString(),
          staffId: member.id,
          staffName: member.name,
          label: formatSlotLabel(startsAt, timezone),
        })
      }
    }
  }

  slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  return slots.slice(0, limit)
}

export interface BookingInput {
  businessId: string
  serviceId: string
  staffId: string
  startsAt: string
  client: { fullName: string; phone: string; messengerPsid?: string }
  source: 'messenger' | 'web' | 'manual'
  intakeNote?: string
}

export type BookingResult =
  | { ok: true; appointmentId: string; referenceCode: string }
  | { ok: false; reason: 'conflict' | 'error'; message: string }

function generateReferenceCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10)
  }
  return code
}

/**
 * True if this client already has a pending/confirmed appointment with this
 * business on the same calendar day (business timezone) as `startsAtIso`.
 * Used to stop a single customer from booking out an entire day's capacity
 * on self-service channels (web/Messenger) — staff manual bookings bypass this.
 */
export async function hasSameDayBooking(
  db: SupabaseClient,
  businessId: string,
  timezone: string,
  startsAtIso: string,
  client: { phone?: string; messengerPsid?: string }
): Promise<boolean> {
  if (!client.phone && !client.messengerPsid) return false

  let clientQuery = db.from('clients').select('id').eq('business_id', businessId)
  clientQuery = client.messengerPsid
    ? clientQuery.eq('messenger_psid', client.messengerPsid)
    : clientQuery.eq('phone', client.phone as string).is('messenger_psid', null)
  const { data: existingClient } = await clientQuery.maybeSingle()
  if (!existingClient) return false

  const { y, m, d } = dateInTz(new Date(startsAtIso), timezone)
  const dayStart = zonedToUtc(y, m, d, 0, 0, timezone)
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000)

  const { count } = await db
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('client_id', existingClient.id)
    .in('status', ['pending', 'confirmed'])
    .gte('starts_at', dayStart.toISOString())
    .lt('starts_at', dayEnd.toISOString())

  return (count ?? 0) > 0
}

// Insert an appointment; the DB exclusion constraint is the final guard
// against double-booking under concurrency.
export async function bookAppointment(db: SupabaseClient, input: BookingInput): Promise<BookingResult> {
  // Scoped by business_id, not just id — the public booking API passes these
  // straight from client JSON with no other ownership check (this function
  // runs on the admin client there, so RLS doesn't catch a mismatch either).
  // Without this, a request could book business A using a service or staff
  // row that actually belongs to business B.
  const { data: service } = await db
    .from('services')
    .select('duration_min')
    .eq('id', input.serviceId)
    .eq('business_id', input.businessId)
    .single()
  if (!service) return { ok: false, reason: 'error', message: 'Service not found' }

  const { count: staffCount } = await db
    .from('staff')
    .select('id', { count: 'exact', head: true })
    .eq('id', input.staffId)
    .eq('business_id', input.businessId)
  if (!staffCount) return { ok: false, reason: 'error', message: 'Staff member not found' }

  // Find or create the client (by PSID for Messenger, by phone for web).
  let clientId: string | null = null
  if (input.client.messengerPsid) {
    const { data } = await db
      .from('clients')
      .select('id')
      .eq('business_id', input.businessId)
      .eq('messenger_psid', input.client.messengerPsid)
      .maybeSingle()
    clientId = data?.id ?? null
  } else if (input.client.phone) {
    const { data } = await db
      .from('clients')
      .select('id')
      .eq('business_id', input.businessId)
      .eq('phone', input.client.phone)
      .is('messenger_psid', null)
      .maybeSingle()
    clientId = data?.id ?? null
  }

  if (clientId) {
    await db
      .from('clients')
      .update({ full_name: input.client.fullName, phone: input.client.phone })
      .eq('id', clientId)
  } else {
    const { data, error } = await db
      .from('clients')
      .insert({
        business_id: input.businessId,
        full_name: input.client.fullName,
        phone: input.client.phone,
        messenger_psid: input.client.messengerPsid ?? null,
      })
      .select('id')
      .single()
    if (error || !data) return { ok: false, reason: 'error', message: error?.message ?? 'Client insert failed' }
    clientId = data.id
  }

  const startsAt = new Date(input.startsAt)
  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000)

  // Retry on the astronomically unlikely chance of a reference_code collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const referenceCode = generateReferenceCode()
    const { data: appt, error } = await db
      .from('appointments')
      .insert({
        business_id: input.businessId,
        client_id: clientId,
        staff_id: input.staffId,
        service_id: input.serviceId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'confirmed',
        source: input.source,
        intake_note: input.intakeNote ?? '',
        reference_code: referenceCode,
      })
      .select('id')
      .single()

    if (!error) return { ok: true, appointmentId: appt.id, referenceCode }

    // 23P01 = exclusion constraint violation → slot was taken concurrently
    if (error.code === '23P01') {
      return { ok: false, reason: 'conflict', message: 'That slot was just taken.' }
    }
    // 23505 = unique violation — retry with a fresh code unless it's some other conflict.
    if (error.code === '23505' && error.message.includes('reference_code')) continue
    return { ok: false, reason: 'error', message: error.message }
  }
  return { ok: false, reason: 'error', message: 'Could not generate a unique reference code — please try again.' }
}
