import type { SupabaseClient } from '@supabase/supabase-js'

// Fire-and-forget analytics log. Everything is recorded from day one so
// Phase 2 features (no-show prediction, recall campaigns, AI cost tracking)
// have historical data to work with.
export async function logEvent(
  db: SupabaseClient,
  businessId: string | null,
  type: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  try {
    await db.from('events').insert({ business_id: businessId, type, payload })
  } catch {
    // Never let analytics failures break the booking path.
  }
}
