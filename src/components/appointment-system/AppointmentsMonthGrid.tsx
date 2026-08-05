import Link from 'next/link'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const BADGE_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  confirmed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  completed: 'bg-slate-500/15 text-slate-400 border-slate-600/30',
  other: 'bg-red-500/10 text-red-400/70 border-red-500/20',
}

export interface MonthDay {
  key: string
  dayNum: number
  isCurrentMonth: boolean
  isToday: boolean
  weekOffset: number
  total: number
  dominant: 'pending' | 'confirmed' | 'completed' | 'other' | null
}

export default function AppointmentsMonthGrid({
  monthLabel,
  monthOffset,
  days,
}: {
  monthLabel: string
  monthOffset: number
  days: MonthDay[]
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate-400 text-sm">{monthLabel}</p>
        <div className="flex items-center gap-2">
          <Link
            href={`/appointments/dashboard/appointments?view=month&m=${monthOffset - 1}`}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-emerald-400 transition"
          >
            ← Prev
          </Link>
          <Link
            href="/appointments/dashboard/appointments?view=month"
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              monthOffset === 0
                ? 'border-emerald-400 text-emerald-300'
                : 'border-slate-700 text-slate-300 hover:border-emerald-400'
            }`}
          >
            This month
          </Link>
          <Link
            href={`/appointments/dashboard/appointments?view=month&m=${monthOffset + 1}`}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-emerald-400 transition"
          >
            Next →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-1 pb-1 text-center text-xs font-semibold text-slate-500">
            {label}
          </div>
        ))}
        {days.map((d) => (
          <Link
            key={d.key}
            href={`/appointments/dashboard/appointments?view=week&w=${d.weekOffset}`}
            className={`min-h-[64px] rounded-lg border p-1.5 text-left transition hover:border-emerald-400 ${
              d.isToday
                ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
                : 'border-slate-800 bg-slate-900/40'
            } ${d.isCurrentMonth ? '' : 'opacity-40'}`}
          >
            <span className={`text-xs ${d.isToday ? 'font-bold text-emerald-300' : 'text-slate-400'}`}>
              {d.dayNum}
            </span>
            {d.total > 0 && (
              <span
                className={`mt-1 block w-fit rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${
                  BADGE_STYLES[d.dominant ?? 'other']
                }`}
              >
                {d.total}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
