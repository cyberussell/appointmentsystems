import { Check as CheckIcon } from 'lucide-react'
import { PLANS, PLAN_ORDER } from '@/lib/appointment-system/entitlements'

type Cell = boolean | string

// Single source of truth for the feature comparison — shown on both the
// public landing page and the logged-in Billing tab, so they can never drift.
// "Soon" marks anything not actually shippable yet — see PLAN_BULLETS in
// entitlements.ts for the same rule applied to the pricing cards.
const COMPARISON: { feature: string; cells: [Cell, Cell, Cell] }[] = [
  { feature: 'Staff logins', cells: ['1', '5', 'Unlimited'] },
  { feature: 'Monthly appointments', cells: ['100', 'Unlimited', 'Unlimited'] },
  { feature: 'Public booking page', cells: [true, true, true] },
  { feature: 'Appointment calendar & dashboard', cells: [true, true, true] },
  { feature: 'Customer records & notes', cells: [true, true, true] },
  { feature: 'No-show tracking', cells: [true, true, true] },
  { feature: 'Business hours', cells: [true, true, true] },
  { feature: 'Breaks & blocked dates', cells: [true, true, true] },
  { feature: 'Manual & walk-in bookings', cells: [true, true, true] },
  { feature: 'Cancellation & rescheduling', cells: [true, true, true] },
  { feature: 'Email notifications', cells: [false, true, true] },
  { feature: 'Calendar sync', cells: [false, 'Soon', 'Soon'] },
  { feature: 'Reporting', cells: [false, true, true] },
  { feature: 'Waitlist', cells: [false, 'Soon', 'Soon'] },
  { feature: 'Messenger booking bot', cells: [false, false, true] },
  { feature: 'SMS + email reminders', cells: [false, false, 'Soon'] },
  { feature: 'Deposits', cells: [false, false, 'Soon'] },
  { feature: 'White label', cells: [false, false, 'Soon'] },
  { feature: 'Data export', cells: [false, false, 'Soon'] },
  { feature: 'Recurring appointments', cells: [false, false, 'Soon'] },
  { feature: 'Memberships & packages', cells: [false, false, 'Soon'] },
]

function Check() {
  return <CheckIcon aria-label="Included" className="h-4 w-4 shrink-0 text-emerald-400" />
}
function Dash() {
  return (
    <span aria-label="Not included" className="text-slate-600">
      —
    </span>
  )
}

function ComparisonTable() {
  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">Feature comparison across plans</caption>
          <thead>
            <tr className="bg-white/[0.06] text-left">
              <th scope="col" className="px-4 py-3 font-semibold text-white">
                Feature
              </th>
              {PLAN_ORDER.map((tier) => (
                <th
                  key={tier}
                  scope="col"
                  className={`px-4 py-3 text-center font-semibold ${tier === 'pro' ? 'text-emerald-300' : 'text-white'}`}
                >
                  {PLANS[tier].name}
                  <span className="block text-[11px] font-normal text-slate-400">
                    {PLANS[tier].priceMonthly === 0 ? '₱0' : `₱${PLANS[tier].priceMonthly.toLocaleString('en-PH')}`}/mo
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row, i) => (
              <tr key={row.feature} className={i % 2 ? 'bg-white/[0.03]' : ''}>
                <th scope="row" className="px-4 py-2.5 text-left font-normal text-slate-300">
                  {row.feature}
                </th>
                {row.cells.map((cell, j) => (
                  <td key={j} className="px-4 py-2.5 text-center text-slate-300">
                    {cell === true ? (
                      <span className="flex justify-center">
                        <Check />
                      </span>
                    ) : cell === false ? (
                      <Dash />
                    ) : cell === 'Soon' ? (
                      <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[11px] text-amber-300">Soon</span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        Features marked &ldquo;Soon&rdquo; are on the roadmap and not yet available.
      </p>
    </>
  )
}

/** Collapsible "Compare all features" table — used on both the landing page and the logged-in Billing tab. */
export default function PlanComparisonTable({
  toggleClassName = 'mx-auto flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm text-slate-200 hover:bg-slate-800 [&::-webkit-details-marker]:hidden',
}: {
  toggleClassName?: string
}) {
  return (
    <details className="group">
      <summary className={toggleClassName}>
        Compare all features
        <span className="transition group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="mt-6">
        <ComparisonTable />
      </div>
    </details>
  )
}
