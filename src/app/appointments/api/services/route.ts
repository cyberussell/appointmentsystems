import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import type { Business } from '@/lib/appointment-system/types'

export const dynamic = 'force-dynamic'

// GET /appointments/api/services?business=slug → a business's active
// services. Generic across every tenant — not specific to any one business,
// same pattern as /appointments/api/book.
export async function GET(request: NextRequest) {
  const businessSlug = request.nextUrl.searchParams.get('business')
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

  const { data: services } = await db
    .from('services')
    .select('id, name, price, duration_min')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('created_at')

  return NextResponse.json({ services: services ?? [] })
}
