import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import type { Business } from '@/lib/appointment-system/types'

export const dynamic = 'force-dynamic'

// GET /appointments/api/staff?business=slug[&service=id] → a business's
// active staff. Each staff member includes serviceIds: the specific
// services they're restricted to, or null if unrestricted (can perform
// any service) — same "no staff_services rows = unrestricted" rule
// getAvailableSlots() uses. Returning this on every response (not just
// when &service is passed) lets a client cross-filter in either
// direction — by service, or by staff — from one fetch, with no extra
// round trip and no risk of the two filters racing each other.
// Passing &service=id additionally narrows the returned list to just
// those eligible for that one service, for callers that only care about
// one direction.
export async function GET(request: NextRequest) {
  const businessSlug = request.nextUrl.searchParams.get('business')
  const serviceId = request.nextUrl.searchParams.get('service')
  if (!businessSlug) {
    return NextResponse.json({ error: 'business is required' }, { status: 400 })
  }

  const db = createAdminSupabase()
  const { data: business } = await db
    .from('businesses')
    .select('id, plan_status')
    .eq('slug', businessSlug)
    .maybeSingle()
  if (!business || (business as Business).plan_status === 'suspended') {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const [{ data: staffRows }, { data: staffServiceRows }] = await Promise.all([
    db
      .from('staff')
      .select('id, name, title')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('created_at'),
    db.from('staff_services').select('staff_id, service_id').eq('business_id', business.id),
  ])

  const serviceIdsByStaff = new Map<string, string[]>()
  for (const row of staffServiceRows ?? []) {
    const list = serviceIdsByStaff.get(row.staff_id) ?? []
    list.push(row.service_id)
    serviceIdsByStaff.set(row.staff_id, list)
  }

  let staff = (staffRows ?? []).map((s) => ({
    ...s,
    serviceIds: serviceIdsByStaff.get(s.id) ?? null,
  }))

  if (serviceId) {
    staff = staff.filter((s) => s.serviceIds === null || s.serviceIds.includes(serviceId))
  }

  return NextResponse.json({ staff })
}
