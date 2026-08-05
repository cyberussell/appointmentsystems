import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hasConfiguredHours, wallTimeToUtc, formatSlotLabel, bookAppointment } from './slots'
import { createAdminSupabase } from './supabase-server'

describe('hasConfiguredHours', () => {
  it('is false with no hours set', () => {
    expect(hasConfiguredHours({ settings: {} })).toBe(false)
  })

  it('is false when every day is null', () => {
    expect(hasConfiguredHours({ settings: { hours: [null, null, null, null, null, null, null] } })).toBe(false)
  })

  it('is true once at least one day is set', () => {
    expect(
      hasConfiguredHours({ settings: { hours: [null, { open: '09:00', close: '17:00' }, null, null, null, null, null] } })
    ).toBe(true)
  })
})

describe('wallTimeToUtc', () => {
  it('converts a Manila wall-clock time to the correct UTC instant', () => {
    // Asia/Manila is UTC+8 year-round (no DST) — 2:00 PM local is 6:00 AM UTC.
    const result = wallTimeToUtc('2026-07-06T14:00', 'Asia/Manila')
    expect(result?.toISOString()).toBe('2026-07-06T06:00:00.000Z')
  })

  it('returns null for a malformed value', () => {
    expect(wallTimeToUtc('not-a-date', 'Asia/Manila')).toBeNull()
  })
})

describe('formatSlotLabel', () => {
  it('formats a UTC instant as a Manila-local label', () => {
    const label = formatSlotLabel('2026-07-06T06:00:00.000Z', 'Asia/Manila')
    expect(label).toContain('2:00 PM')
  })
})

// Regression test for the Critical cross-tenant IDOR fixed 2026-07-14: a
// booking's serviceId/staffId must belong to the business being booked, not
// just exist somewhere in the database. Runs against the real Supabase
// project (throwaway rows, cleaned up after) since this is exactly the kind
// of DB-enforced-vs-app-enforced boundary a mock would paper over.
describe('bookAppointment cross-tenant guard', () => {
  const db = createAdminSupabase()
  let victimBusinessId: string
  let victimOwnerId: string
  let attackerBusinessId: string
  let attackerOwnerId: string
  let attackerServiceId: string
  let attackerStaffId: string
  let victimServiceId: string
  let victimStaffId: string

  beforeAll(async () => {
    const suffix = Math.random().toString(36).slice(2, 8)

    const { data: victimOwner } = await db.auth.admin.createUser({
      email: `vitest-victim-${suffix}@cyberussell-test.com`,
      password: 'VitestTest2026!',
      email_confirm: true,
    })
    victimOwnerId = victimOwner!.user!.id
    const { data: victimBiz } = await db
      .from('businesses')
      .insert({ owner_id: victimOwnerId, name: 'Vitest Victim', slug: `vitest-victim-${suffix}`, business_types: ['medical'] })
      .select('id')
      .single()
    victimBusinessId = victimBiz!.id
    const { data: vStaff } = await db.from('staff').insert({ business_id: victimBusinessId, name: 'Victim Staff', active: true }).select('id').single()
    victimStaffId = vStaff!.id
    const { data: vService } = await db
      .from('services')
      .insert({ business_id: victimBusinessId, name: 'Victim Service', duration_min: 30, price: 100 })
      .select('id')
      .single()
    victimServiceId = vService!.id

    const { data: attackerOwner } = await db.auth.admin.createUser({
      email: `vitest-attacker-${suffix}@cyberussell-test.com`,
      password: 'VitestTest2026!',
      email_confirm: true,
    })
    attackerOwnerId = attackerOwner!.user!.id
    const { data: attackerBiz } = await db
      .from('businesses')
      .insert({ owner_id: attackerOwnerId, name: 'Vitest Attacker', slug: `vitest-attacker-${suffix}`, business_types: ['medical'] })
      .select('id')
      .single()
    attackerBusinessId = attackerBiz!.id
    const { data: aStaff } = await db.from('staff').insert({ business_id: attackerBusinessId, name: 'Attacker Staff', active: true }).select('id').single()
    attackerStaffId = aStaff!.id
    const { data: aService } = await db
      .from('services')
      .insert({ business_id: attackerBusinessId, name: 'Attacker Service', duration_min: 30, price: 100 })
      .select('id')
      .single()
    attackerServiceId = aService!.id
  })

  afterAll(async () => {
    await db.from('businesses').delete().eq('id', victimBusinessId)
    await db.from('businesses').delete().eq('id', attackerBusinessId)
    await db.auth.admin.deleteUser(victimOwnerId)
    await db.auth.admin.deleteUser(attackerOwnerId)
  })

  it('rejects a booking naming one business but another business\'s service/staff ids', async () => {
    const result = await bookAppointment(db, {
      businessId: victimBusinessId,
      serviceId: attackerServiceId,
      staffId: attackerStaffId,
      startsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      client: { fullName: 'Vitest Attacker Client', phone: '09170000001' },
      source: 'web',
    })
    expect(result.ok).toBe(false)

    const { count } = await db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', victimBusinessId)
      .eq('staff_id', attackerStaffId)
    expect(count).toBe(0)
  })

  it('still allows a normal same-business booking', async () => {
    const result = await bookAppointment(db, {
      businessId: victimBusinessId,
      serviceId: victimServiceId,
      staffId: victimStaffId,
      startsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      client: { fullName: 'Vitest Legit Client', phone: '09170000002' },
      source: 'web',
    })
    expect(result.ok).toBe(true)
  })
})
