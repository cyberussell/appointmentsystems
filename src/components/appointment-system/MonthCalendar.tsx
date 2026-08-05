'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function dateKeyInTz(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(iso)
  )
}

export function timeInTz(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-PH', { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

export function dateLabelInTz(dateKey: string, timeZone: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat('en-PH', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)))
}

export default function MonthCalendar({
  cursor,
  onNavigate,
  availableDateKeys,
  todayKey,
  onPick,
}: {
  cursor: { year: number; month: number } // month is 0-indexed
  onNavigate: (next: { year: number; month: number }) => void
  availableDateKeys: Set<string>
  todayKey: string
  onPick: (dateKey: string) => void
}) {
  const { year, month } = cursor
  const firstOfMonth = new Date(year, month, 1)
  const firstDow = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks = Math.ceil((firstDow + daysInMonth) / 7)
  const gridStart = new Date(year, month, 1 - firstDow)

  const days = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return {
      key,
      dayNum: d.getDate(),
      isCurrentMonth: d.getMonth() === month,
      isToday: key === todayKey,
      isAvailable: availableDateKeys.has(key),
    }
  })

  const monthLabel = firstOfMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
  const isTodayMonth = todayKey.slice(0, 7) === `${year}-${String(month + 1).padStart(2, '0')}`

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          disabled={isTodayMonth}
          onClick={() => onNavigate({ year: month === 0 ? year - 1 : year, month: month === 0 ? 11 : month - 1 })}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <p className="text-sm font-semibold text-white">{monthLabel}</p>
        <button
          type="button"
          onClick={() => onNavigate({ year: month === 11 ? year + 1 : year, month: month === 11 ? 0 : month + 1 })}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((l) => (
          <div key={l} className="pb-1 text-center text-[11px] font-medium text-slate-500">
            {l}
          </div>
        ))}
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            disabled={!d.isAvailable}
            onClick={() => onPick(d.key)}
            className={`aspect-square rounded-lg border text-sm font-medium transition-all duration-150 ${
              d.isAvailable
                ? 'cursor-pointer border-white/10 bg-white/[0.02] text-white hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-emerald-500/[0.08] hover:text-emerald-300'
                : 'cursor-not-allowed border-transparent text-slate-700'
            } ${d.isToday ? 'ring-1 ring-emerald-400/40' : ''} ${!d.isCurrentMonth ? 'opacity-40' : ''}`}
          >
            {d.dayNum}
          </button>
        ))}
      </div>
    </div>
  )
}
