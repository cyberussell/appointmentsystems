import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'

export const dynamic = 'force-dynamic'

// GET /appointments/api/health — for uptime monitors. Confirms the app can
// actually reach the Supabase project, not just that the process is alive.
export async function GET() {
  try {
    const db = createAdminSupabase()
    const { error } = await db.from('businesses').select('id', { head: true, count: 'exact' }).limit(1)
    if (error) throw error
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'error', timestamp: new Date().toISOString() }, { status: 503 })
  }
}
