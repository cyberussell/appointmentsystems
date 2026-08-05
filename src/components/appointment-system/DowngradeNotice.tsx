import { TriangleAlert } from 'lucide-react'
import { FEATURE_LABELS, PLANS } from '@/lib/appointment-system/entitlements'
import type { PlanTier } from '@/lib/appointment-system/types'
import { dismissDowngradeNotice } from '@/app/appointments/actions'

// Post-downgrade counterpart to BillingPlanCard's pre-downgrade confirmation
// — same "here's what changed" facts, just stated after the fact instead of
// asked as a confirmation, since the payment already went through.
export default function DowngradeNotice({ from, to }: { from: PlanTier; to: PlanTier }) {
  const fromPlan = PLANS[from]
  const toPlan = PLANS[to]
  const lostFeatures = fromPlan.features.filter((f) => !toPlan.features.includes(f)).map((f) => FEATURE_LABELS[f])
  const losesUnlimitedStaff = fromPlan.providerLimit === null && toPlan.providerLimit !== null
  const losesUnlimitedAppointments = fromPlan.monthlyAppointments === null && toPlan.monthlyAppointments !== null

  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-200">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-1.5 font-semibold">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          Your plan changed from {fromPlan.name} to {toPlan.name}
        </p>
        <form action={dismissDowngradeNotice}>
          <button className="shrink-0 text-xs text-amber-300/70 hover:text-amber-200">Dismiss</button>
        </form>
      </div>
      <ul className="mt-1.5 list-disc space-y-1 pl-9">
        {losesUnlimitedStaff && <li>Staff are now capped at {toPlan.providerLimit} — existing staff over that limit stay active until you deactivate someone.</li>}
        {losesUnlimitedAppointments && <li>Appointments are now capped at {toPlan.monthlyAppointments}/month.</li>}
        {lostFeatures.map((label) => (
          <li key={label}>{label} is no longer available.</li>
        ))}
        {!losesUnlimitedStaff && !losesUnlimitedAppointments && lostFeatures.length === 0 && (
          <li>No functional changes beyond the plan name — you&apos;re within all {toPlan.name} limits already.</li>
        )}
      </ul>
    </div>
  )
}
