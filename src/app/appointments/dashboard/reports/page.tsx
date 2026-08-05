import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { requireBusiness } from '@/lib/appointment-system/auth'
import { hasFeature, tierWithFeature } from '@/lib/appointment-system/entitlements'

export const dynamic = 'force-dynamic'

function dateKeyInTz(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

interface DayBucket {
  key: string
  label: string
  revenue: number
}

export default async function ReportsPage() {
  const { supabase, business } = await requireBusiness()
  const entitled = hasFeature(business, 'basic_reporting')

  if (!entitled) {
    return <ReportsPreview />
  }

  const now = new Date()
  const last30 = new Date(now.getTime() - 30 * 86400_000)

  const { data: paidAppts } = await supabase
    .from('appointments')
    .select('amount_paid, paid_at, services(name)')
    .eq('business_id', business.id)
    .gt('amount_paid', 0)
    .gte('paid_at', last30.toISOString())
    .lte('paid_at', now.toISOString())

  const rows = (paidAppts ?? []) as unknown as {
    amount_paid: number
    paid_at: string
    services: { name: string } | null
  }[]

  // Build the 30 day buckets up front so days with zero revenue still show as
  // an empty bar, in the business's own timezone (never mix local Date
  // mutation with UTC slicing here — that's what silently dropped a day's
  // revenue on a sibling product last time this pattern was built).
  const buckets = new Map<string, DayBucket>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000)
    const key = dateKeyInTz(d.toISOString(), business.timezone)
    buckets.set(key, {
      key,
      label: new Intl.DateTimeFormat('en-PH', { timeZone: business.timezone, month: 'short', day: 'numeric' }).format(d),
      revenue: 0,
    })
  }

  const serviceTotals = new Map<string, { bookings: number; revenue: number }>()
  let totalRevenue = 0

  for (const r of rows) {
    const key = dateKeyInTz(r.paid_at, business.timezone)
    const bucket = buckets.get(key)
    const amount = Number(r.amount_paid)
    if (bucket) bucket.revenue += amount
    totalRevenue += amount

    const serviceName = r.services?.name ?? 'Unknown service'
    const existing = serviceTotals.get(serviceName) ?? { bookings: 0, revenue: 0 }
    existing.bookings += 1
    existing.revenue += amount
    serviceTotals.set(serviceName, existing)
  }

  const dayBuckets = Array.from(buckets.values())
  const maxDay = Math.max(1, ...dayBuckets.map((b) => b.revenue))
  const serviceRows = Array.from(serviceTotals.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)

  const appointmentCount = rows.length
  const avgPerAppointment = appointmentCount > 0 ? totalRevenue / appointmentCount : 0

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Revenue" value={`₱${totalRevenue.toLocaleString('en-PH')}`} sub="last 30 days" />
        <StatCard label="Paid appointments" value={String(appointmentCount)} sub="last 30 days" />
        <StatCard
          label="Avg per appointment"
          value={`₱${avgPerAppointment.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`}
          sub="last 30 days"
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Revenue — last 30 days</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-end gap-[3px] h-40">
            {dayBuckets.map((b) => (
              <div key={b.key} className="group relative flex-1 h-full flex items-end" title={`${b.label}: ₱${b.revenue.toLocaleString('en-PH')}`}>
                <div
                  className="w-full rounded-t bg-emerald-500/70 group-hover:bg-emerald-400 transition"
                  style={{ height: `${Math.max(2, (b.revenue / maxDay) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-500">
            <span>{dayBuckets[0]?.label}</span>
            <span>{dayBuckets[dayBuckets.length - 1]?.label}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">By service — last 30 days</h2>
        {serviceRows.length === 0 ? (
          <p className="text-slate-500 text-sm">No paid appointments yet in this window.</p>
        ) : (
          <ul className="space-y-2">
            {serviceRows.map((s) => (
              <li
                key={s.name}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-slate-400">
                    {s.bookings} booking{s.bookings === 1 ? '' : 's'}
                  </p>
                </div>
                <p className="text-lg font-bold text-emerald-300">₱{s.revenue.toLocaleString('en-PH')}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-emerald-300">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  )
}

// Sample data so a Free/gated business can see exactly what Reports looks
// like before paying for it, per the "preview, not access denied" rule.
const SAMPLE_DAYS = Array.from({ length: 30 }, (_, i) => ({
  key: String(i),
  height: 15 + Math.round(Math.abs(Math.sin(i / 3.2)) * 80),
}))
const SAMPLE_SERVICES = [
  { name: 'Haircut', bookings: 24, revenue: 7200 },
  { name: 'Hair Color', bookings: 9, revenue: 13500 },
  { name: 'Manicure', bookings: 15, revenue: 4500 },
]

function ReportsPreview() {
  const upgrade = tierWithFeature('basic_reporting')
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-200 flex items-start gap-2">
        <TrendingUp className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
        <span>
          Reports is available on the {upgrade.name} plan (₱{upgrade.priceMonthly.toLocaleString('en-PH')}/mo) —
          here&apos;s what you&apos;ll see once you upgrade.{' '}
          <Link href="/appointments#pricing" className="font-semibold underline underline-offset-4">
            Compare plans
          </Link>
          .
        </span>
      </div>

      <div className="relative">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 blur-[3px] pointer-events-none select-none opacity-60">
          <StatCard label="Revenue" value="₱25,200" sub="last 30 days" />
          <StatCard label="Paid appointments" value="48" sub="last 30 days" />
          <StatCard label="Avg per appointment" value="₱525" sub="last 30 days" />
        </div>
      </div>

      <div className="space-y-3 blur-[3px] pointer-events-none select-none opacity-60">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Revenue — last 30 days</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-end gap-[3px] h-40">
            {SAMPLE_DAYS.map((d) => (
              <div key={d.key} className="flex-1 h-full flex items-end">
                <div className="w-full rounded-t bg-emerald-500/70" style={{ height: `${d.height}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 blur-[3px] pointer-events-none select-none opacity-60">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">By service — last 30 days</h2>
        <ul className="space-y-2">
          {SAMPLE_SERVICES.map((s) => (
            <li
              key={s.name}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-slate-400">{s.bookings} bookings</p>
              </div>
              <p className="text-lg font-bold text-emerald-300">₱{s.revenue.toLocaleString('en-PH')}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
