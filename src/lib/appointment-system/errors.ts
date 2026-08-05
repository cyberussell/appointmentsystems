import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logEvent } from './events'

// Persists unexpected failures (webhook exceptions, external API calls that
// throw) to the existing `events` table so they're queryable after the fact
// instead of living only in Vercel's ephemeral function logs. Deliberately
// reuses `events` rather than standing up a new table/service — no new
// account or infra needed, and `logEvent` already never throws.
export async function logError(
  db: SupabaseClient,
  businessId: string | null,
  source: string,
  error: unknown
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  await logEvent(db, businessId, 'error', { source, message, stack })
}
