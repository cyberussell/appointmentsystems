import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import { sendDueReminders } from '@/lib/appointment-system/reminders'
import { logError } from '@/lib/appointment-system/errors'

export const dynamic = 'force-dynamic'

// GET /appointments/api/cron/reminders — invoked daily by Vercel Cron (see
// vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`; anything
// else is rejected so the endpoint can't be used to spam customers.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminSupabase()
  try {
    const result = await sendDueReminders(db)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[appointment-system] reminder cron failed', error)
    await logError(db, null, 'cron_reminders', error)
    return NextResponse.json({ error: 'Reminder run failed' }, { status: 500 })
  }
}
