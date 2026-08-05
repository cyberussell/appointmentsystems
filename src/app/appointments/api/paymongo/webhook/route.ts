import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import { verifyPaymongoSignature } from '@/lib/appointment-system/paymongo'
import { logEvent } from '@/lib/appointment-system/events'
import { logError } from '@/lib/appointment-system/errors'
import { PLAN_ORDER } from '@/lib/appointment-system/entitlements'
import type { PlanTier } from '@/lib/appointment-system/types'

export const dynamic = 'force-dynamic'

interface PaymongoEvent {
  data: {
    attributes: {
      type: string
      data: {
        id: string
        attributes: {
          metadata: { business_id?: string; tier?: string } | null
        }
      }
    }
  }
}

// POST /appointments/api/paymongo/webhook — PayMongo "Pay Now" checkout completion.
// Registered separately from any other webhook already on this shared PayMongo account.
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const secret = process.env.APPOINTMENTS_PAYMONGO_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const signature = request.headers.get('paymongo-signature')
  if (!verifyPaymongoSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Everything past signature verification is wrapped so a thrown exception
  // here — a malformed payload, an unexpected Supabase failure — leaves a
  // queryable record instead of vanishing into Vercel's ephemeral function
  // logs. A customer paid; if this silently fails, they paid for nothing.
  let businessIdForErrorLog: string | null = null
  try {
    const event = JSON.parse(rawBody) as PaymongoEvent
    const eventType = event.data.attributes.type

    if (eventType === 'checkout_session.payment.paid') {
      const session = event.data.attributes.data
      const businessId = session.attributes.metadata?.business_id
      const tier = session.attributes.metadata?.tier
      businessIdForErrorLog = businessId ?? null
      if (businessId && tier) {
        const db = createAdminSupabase()
        const renewsAt = new Date(Date.now() + 30 * 86400_000)

        const { data: current } = await db
          .from('businesses')
          .select('plan_tier, settings')
          .eq('id', businessId)
          .maybeSingle()

        // A downgrade still goes through this same "pay now" webhook (the lower
        // tier's price, not zero) — detect it here by comparing against the
        // tier being replaced, and leave a one-time notice for the owner to see
        // on next dashboard load.
        const isDowngrade =
          current &&
          PLAN_ORDER.includes(current.plan_tier as PlanTier) &&
          PLAN_ORDER.indexOf(tier as PlanTier) < PLAN_ORDER.indexOf(current.plan_tier as PlanTier)

        const settings = (current?.settings as Record<string, unknown>) ?? {}
        const nextSettings = isDowngrade
          ? { ...settings, downgrade_notice: { from: current!.plan_tier, to: tier, at: new Date().toISOString() } }
          : settings

        const { error: updateError } = await db
          .from('businesses')
          .update({
            plan_tier: tier,
            plan_status: 'active',
            plan_renews_at: renewsAt.toISOString(),
            settings: nextSettings,
          })
          .eq('id', businessId)
          .eq('paymongo_checkout_session_id', session.id)
        if (updateError) throw updateError
        await logEvent(db, businessId, 'billing_payment_paid', { tier, checkout_session_id: session.id })
      }
    }
  } catch (error) {
    console.error('[appointment-system] paymongo webhook failed', error)
    await logError(createAdminSupabase(), businessIdForErrorLog, 'paymongo_webhook', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
