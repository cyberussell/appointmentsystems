import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import type { Business } from '@/lib/appointment-system/types'

export const dynamic = 'force-dynamic'

// GET /appointments/api/staff?business=slug[&service=id] → a business's
// active staff, optionally scoped to who can perform a given service.
// Mirrors getAvailableSlots()'s "no staff_services rows = unrestricted,
// can perform any service" eligibility rule, so a client never has to
// re-derive it from raw staff_services rows itself.
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

  const { data: staffRows } = await db
    .from('staff')
    .select('id, name, title')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('created_at')
  const staff = staffRows ?? []

  if (!serviceId) {
    return NextResponse.json({ staff })
  }

  const { data: staffServiceRows } = await db
    .from('staff_services')
    .select('staff_id, service_id')
    .eq('business_id', business.id)
  const rows = staffServiceRows ?? []
  const restrictedStaffIds = new Set(rows.map((r) => r.staff_id))
  const eligibleForThisService = new Set(rows.filter((r) => r.service_id === serviceId).map((r) => r.staff_id))
  const eligible = staff.filter((s) => !restrictedStaffIds.has(s.id) || eligibleForThisService.has(s.id))

  return NextResponse.json({ staff: eligible })
}
