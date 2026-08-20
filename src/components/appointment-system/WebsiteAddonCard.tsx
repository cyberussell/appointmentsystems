'use client'

import { useActionState, useEffect } from 'react'
import { initiateAddonCheckout, type BillingActionResult } from '@/app/appointments/actions'
import { WEBSITE_ADDON_PRICE_YEARLY } from '@/lib/appointment-system/entitlements'

export default function WebsiteAddonCard({
  hasAddon,
  expiresAt,
}: {
  hasAddon: boolean
  expiresAt: string | null
}) {
  const [state, formAction, pending] = useActionState<BillingActionResult, FormData>(initiateAddonCheckout, {})

  useEffect(() => {
    if (state.checkoutUrl) window.location.href = state.checkoutUrl
  }, [state.checkoutUrl])

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm font-semibold text-slate-300">Website add-on</p>
      {hasAddon ? (
        <p className="mt-2 text-sm text-emerald-300">
          Active
          {expiresAt &&
            ` — renews ${new Date(expiresAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`}
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-400">
            A custom website for your business, built and hosted by us — ₱{WEBSITE_ADDON_PRICE_YEARLY.toLocaleString('en-PH')}/yr on top of your plan.
          </p>
          <form action={formAction} className="mt-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              {pending ? 'Starting checkout…' : `Add a website — ₱${WEBSITE_ADDON_PRICE_YEARLY.toLocaleString('en-PH')}/yr`}
            </button>
          </form>
        </>
      )}
      {state.error && <p className="mt-2 text-xs text-red-400">{state.error}</p>}
    </div>
  )
}
