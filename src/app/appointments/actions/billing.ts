'use server'

import { requireBusiness } from '@/lib/appointment-system/auth'
import { PLANS, PLAN_CHECKOUT_SUMMARY } from '@/lib/appointment-system/entitlements'
import { createBillingCheckout } from '@/lib/appointment-system/paymongo'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import { logError } from '@/lib/appointment-system/errors'
import type { BillingActionResult } from './types'

// ── Billing (PayMongo "Pay Now" checkout — see docs/checkpoints for why this
// isn't PayMongo's native Subscriptions API) ────────────────────────────────

export async function initiateBillingCheckout(
  _prev: BillingActionResult,
  formData: FormData
): Promise<BillingActionResult> {
  const { business } = await requireBusiness()
  const tier = String(formData.get('tier') ?? '')
  const plan = (PLANS as Record<string, (typeof PLANS)[keyof typeof PLANS]>)[tier]
  if (!plan || plan.priceMonthly <= 0) return { error: 'Pick a paid plan to continue.' }

  let checkout
  try {
    checkout = await createBillingCheckout({
      businessId: business.id,
      businessName: business.name,
      tier: plan.tier,
      planName: plan.name,
      featuresSummary: PLAN_CHECKOUT_SUMMARY[plan.tier],
      amountCentavos: Math.round(plan.priceMonthly * 100),
      successUrl: 'https://www.cyberussell.com/appointments/dashboard/billing?paid=1',
      cancelUrl: 'https://www.cyberussell.com/appointments/dashboard/billing?cancelled=1',
    })
  } catch (error) {
    await logError(createAdminSupabase(), business.id, 'initiateBillingCheckout', error)
    return { error: 'Could not start checkout — please try again.' }
  }

  const admin = createAdminSupabase()
  await admin.from('businesses').update({ paymongo_checkout_session_id: checkout.sessionId }).eq('id', business.id)
  // Returned to the client instead of calling redirect() here — Next.js Server
  // Actions driven by useActionState don't reliably navigate the browser to an
  // external origin; the client does `window.location.href = checkoutUrl` instead.
  return { checkoutUrl: checkout.checkoutUrl }
}
