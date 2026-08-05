import { requireBusiness } from '@/lib/appointment-system/auth'
import { PLANS, PLAN_ORDER, canCreateAppointment, canAddProvider } from '@/lib/appointment-system/entitlements'
import BillingPlanCard from '@/components/appointment-system/BillingPlanCard'
import PlanComparisonTable from '@/components/appointment-system/PlanComparisonTable'
import UsageMeter from '@/components/appointment-system/UsageMeter'

export const dynamic = 'force-dynamic'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; cancelled?: string }>
}) {
  const { supabase, business } = await requireBusiness()
  const { paid, cancelled } = await searchParams
  const currentPlan = PLANS[business.plan_tier]
  const [quota, seats] = await Promise.all([canCreateAppointment(supabase, business), canAddProvider(supabase, business)])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-slate-400 text-sm mt-1">
          Current plan: <span className="text-white font-medium">{currentPlan.name}</span>
          {' · '}
          <span
            className={
              business.plan_status === 'active'
                ? 'text-emerald-300'
                : business.plan_status === 'suspended'
                  ? 'text-red-400'
                  : 'text-amber-300'
            }
          >
            {business.plan_status}
          </span>
          {business.plan_renews_at && business.plan_status === 'active' && (
            <>
              {' · renews '}
              {new Date(business.plan_renews_at).toLocaleDateString('en-PH', {
                timeZone: business.timezone,
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-slate-300">Current usage</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <UsageMeter label="Appointments this month" used={quota.used} limit={quota.limit} />
          <UsageMeter label="Staff logins" used={seats.used} limit={seats.limit} />
        </div>
      </div>

      {paid && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          Payment received — your plan will update automatically within a few moments.
        </p>
      )}
      {cancelled && (
        <p className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
          Checkout was cancelled — no charge was made.
        </p>
      )}
      {business.plan_status === 'suspended' && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Your plan payment is overdue and online booking is currently paused. Pay below to reactivate.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {PLAN_ORDER.map((tier) => (
          <BillingPlanCard
            key={tier}
            plan={PLANS[tier]}
            isCurrent={tier === business.plan_tier}
            currentTier={business.plan_tier}
            planStatus={business.plan_status}
            renewsAt={business.plan_renews_at}
          />
        ))}
      </div>

      <PlanComparisonTable />

      <p className="text-xs text-slate-500">
        Prefer GCash or bank transfer? Message us directly and we&apos;ll flip your plan manually after payment.
      </p>
    </div>
  )
}
