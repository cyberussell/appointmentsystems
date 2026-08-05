'use client'

import { useActionState, useEffect, useState } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
import { initiateBillingCheckout, type BillingActionResult } from '@/app/appointments/actions'
import { FEATURE_LABELS, PLANS, PLAN_BULLETS, PLAN_ORDER, type PlanConfig } from '@/lib/appointment-system/entitlements'
import type { PlanTier } from '@/lib/appointment-system/types'

export default function BillingPlanCard({
  plan,
  isCurrent,
  currentTier,
  planStatus,
  renewsAt,
}: {
  plan: PlanConfig
  isCurrent: boolean
  currentTier: PlanTier
  planStatus: string
  renewsAt: string | null
}) {
  const [state, formAction, pending] = useActionState<BillingActionResult, FormData>(initiateBillingCheckout, {})
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (state.checkoutUrl) window.location.href = state.checkoutUrl
  }, [state.checkoutUrl])

  const included = PLAN_BULLETS[plan.tier]

  const currentPlan = PLANS[currentTier]
  const isDowngrade =
    !isCurrent && plan.priceMonthly > 0 && PLAN_ORDER.indexOf(plan.tier) < PLAN_ORDER.indexOf(currentTier)
  const lostFeatures = isDowngrade
    ? currentPlan.features.filter((f) => !plan.features.includes(f)).map((f) => FEATURE_LABELS[f])
    : []
  const losesUnlimitedStaff = isDowngrade && currentPlan.providerLimit === null && plan.providerLimit !== null
  const losesUnlimitedAppointments =
    isDowngrade && currentPlan.monthlyAppointments === null && plan.monthlyAppointments !== null
  const daysRemaining =
    isDowngrade && planStatus === 'active' && renewsAt
      ? Math.max(0, Math.ceil((new Date(renewsAt).getTime() - Date.now()) / 86400_000))
      : 0

  return (
    <div
      className={`relative flex h-full flex-col rounded-xl border p-5 ${
        isCurrent ? 'border-emerald-500/40 bg-emerald-500/[0.03]' : 'border-slate-800 bg-slate-900'
      }`}
    >
      {plan.tier === 'pro' && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold text-slate-950">
          Recommended
        </span>
      )}
      <p className="font-semibold">{plan.name}</p>
      <p className="mt-1 text-2xl font-bold">
        ₱{plan.priceMonthly.toLocaleString('en-PH')}
        <span className="text-sm font-normal text-slate-400">/mo</span>
      </p>
      <p className="mt-1 text-sm text-slate-400">{plan.tagline}</p>

      <ul className="mt-4 space-y-2">
        {included.map((label) => (
          <li key={label} className="flex items-start gap-2 text-sm text-slate-300">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
            {label}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex-1" />

      {isCurrent ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-sm font-medium text-emerald-300">
          Current plan
        </p>
      ) : plan.priceMonthly > 0 ? (
        confirming ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <p className="flex items-center gap-1.5 font-semibold">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Downgrading to {plan.name}
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                {daysRemaining > 0 && (
                  <li>
                    You have {daysRemaining} day{daysRemaining === 1 ? '' : 's'} left on {currentPlan.name} — paying
                    for {plan.name} now starts a new 30-day cycle immediately, and those remaining days are not
                    refunded or credited.
                  </li>
                )}
                {losesUnlimitedStaff && <li>Staff will be capped at {plan.providerLimit} — no longer unlimited.</li>}
                {losesUnlimitedAppointments && (
                  <li>Appointments will be capped at {plan.monthlyAppointments}/month — no longer unlimited.</li>
                )}
                {lostFeatures.map((label) => (
                  <li key={label}>
                    {label} will stop working immediately{label === 'Messenger booking bot' ? ', mid-conversation if a customer is messaging right now' : ''}.
                  </li>
                ))}
              </ul>
            </div>
            <form action={formAction} className="flex gap-2">
              <input type="hidden" name="tier" value={plan.tier} />
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-lg bg-amber-500 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition"
              >
                {pending ? 'Starting checkout…' : `Yes, downgrade & pay ₱${plan.priceMonthly.toLocaleString('en-PH')}`}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-slate-500 transition"
              >
                Cancel
              </button>
            </form>
          </div>
        ) : isDowngrade ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition"
          >
            {`Pay ₱${plan.priceMonthly.toLocaleString('en-PH')} now`}
          </button>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="tier" value={plan.tier} />
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              {pending ? 'Starting checkout…' : `Pay ₱${plan.priceMonthly.toLocaleString('en-PH')} now`}
            </button>
          </form>
        )
      ) : (
        <p className="text-center text-xs text-slate-500">Downgrade by contacting support.</p>
      )}
      {state.error && <p className="mt-2 text-xs text-red-400">{state.error}</p>}
    </div>
  )
}
