'use server'

import { requireBusiness } from '@/lib/appointment-system/auth'
import {
  PLANS,
  PLAN_CHECKOUT_SUMMARY,
  WEBSITE_ADDON_PRICE_YEARLY,
  hasWebsiteAddon,
} from '@/lib/appointment-system/entitlements'
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

  // Only bundle the add-on if it's actually being requested and the business
  // doesn't already have it active — re-selling an active add-on would just
  // extend it early under a confusing "plan" line item.
  const wantsAddon = formData.get('addWebsite') === '1' && !hasWebsiteAddon(business)

  let checkout
  try {
    checkout = await createBillingCheckout({
      businessId: business.id,
      businessName: business.name,
      kind: 'plan',
      tier: plan.tier,
      planName: plan.name,
      featuresSummary: PLAN_CHECKOUT_SUMMARY[plan.tier],
      amountCentavos: Math.round(plan.priceMonthly * 100),
      successUrl: 'https://www.cyberussell.com/appointments/dashboard/billing?paid=1',
      cancelUrl: 'https://www.cyberussell.com/appointments/dashboard/billing?cancelled=1',
      addon: wantsAddon
        ? {
            amountCentavos: Math.round(WEBSITE_ADDON_PRICE_YEARLY * 100),
            description: 'Custom website design + hosting, billed yearly',
          }
        : undefined,
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

export async function initiateAddonCheckout(
  _prev: BillingActionResult,
  _formData: FormData
): Promise<BillingActionResult> {
  const { business } = await requireBusiness()
  if (business.plan_tier === 'free') {
    return { error: 'Upgrade to Basic or Pro to add a website.' }
  }

  let checkout
  try {
    checkout = await createBillingCheckout({
      businessId: business.id,
      businessName: business.name,
      kind: 'addon',
      planName: 'Website add-on',
      featuresSummary: 'Custom website design + hosting, billed yearly',
      amountCentavos: Math.round(WEBSITE_ADDON_PRICE_YEARLY * 100),
      successUrl: 'https://www.cyberussell.com/appointments/dashboard/billing?paid=1',
      cancelUrl: 'https://www.cyberussell.com/appointments/dashboard/billing?cancelled=1',
    })
  } catch (error) {
    await logError(createAdminSupabase(), business.id, 'initiateAddonCheckout', error)
    return { error: 'Could not start checkout — please try again.' }
  }

  const admin = createAdminSupabase()
  await admin
    .from('businesses')
    .update({ website_addon_checkout_session_id: checkout.sessionId })
    .eq('id', business.id)
  return { checkoutUrl: checkout.checkoutUrl }
}
