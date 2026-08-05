'use client'

import { useMemo, useState } from 'react'
import { CircleCheck, Loader2, Phone, Tag, User } from 'lucide-react'
import type { Slot } from '@/lib/appointment-system/types'
import MonthCalendar, { dateKeyInTz, timeInTz, dateLabelInTz } from './MonthCalendar'
import { cancelBookingByCode, rescheduleBookingByCode } from '@/app/appointments/manage/actions'

type Mode = 'view' | 'cancel-confirm' | 'date' | 'time' | 'staff' | 'cancelled' | 'rescheduled'

interface TimeGroup {
  startsAt: string
  slots: Slot[]
}

export default function ManageBookingView({
  code,
  businessSlug,
  businessName,
  timezone,
  serviceId,
  serviceName,
  staffName,
  clientName,
  clientPhone,
  startsAtIso,
  status,
}: {
  code: string
  businessSlug: string
  businessName: string
  timezone: string
  serviceId: string
  serviceName: string
  staffName: string
  clientName?: string
  clientPhone?: string
  startsAtIso: string
  status: string
}) {
  const [mode, setMode] = useState<Mode>('view')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [candidateSlots, setCandidateSlots] = useState<Slot[]>([])
  const [finalLabel, setFinalLabel] = useState<string | null>(null)

  const todayKey = useMemo(() => dateKeyInTz(new Date().toISOString(), timezone), [timezone])
  const [monthCursor, setMonthCursor] = useState(() => {
    const [y, m] = todayKey.split('-').map(Number)
    return { year: y, month: m - 1 }
  })

  const currentLabel = new Intl.DateTimeFormat('en-PH', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(startsAtIso))

  const isActive = status === 'pending' || status === 'confirmed'

  async function startReschedule() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/appointments/api/book?business=${encodeURIComponent(businessSlug)}&service=${encodeURIComponent(serviceId)}`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not load available times')
      setSlots(data.slots ?? [])
      setMode('date')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const availableDateKeys = useMemo(() => {
    const set = new Set<string>()
    for (const s of slots) set.add(dateKeyInTz(s.startsAt, timezone))
    return set
  }, [slots, timezone])

  function pickDate(dateKey: string) {
    setSelectedDate(dateKey)
    setMode('time')
  }

  const timesForSelectedDate = useMemo<TimeGroup[]>(() => {
    if (!selectedDate) return []
    const byTime = new Map<string, Slot[]>()
    for (const s of slots) {
      if (dateKeyInTz(s.startsAt, timezone) !== selectedDate) continue
      const list = byTime.get(s.startsAt) ?? []
      list.push(s)
      byTime.set(s.startsAt, list)
    }
    return Array.from(byTime.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([startsAt, group]) => ({ startsAt, slots: group }))
  }, [slots, selectedDate, timezone])

  async function confirmReschedule(slot: Slot) {
    setLoading(true)
    setError(null)
    try {
      const result = await rescheduleBookingByCode(code, slot.staffId, slot.startsAt)
      if (result.error) throw new Error(result.error)
      setFinalLabel(`${slot.label} with ${slot.staffName}`)
      setMode('rescheduled')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function pickTime(group: TimeGroup) {
    const uniqueStaff = new Set(group.slots.map((s) => s.staffId))
    if (uniqueStaff.size <= 1) {
      confirmReschedule(group.slots[0])
    } else {
      setCandidateSlots(group.slots)
      setMode('staff')
    }
  }

  async function doCancel() {
    setLoading(true)
    setError(null)
    try {
      const result = await cancelBookingByCode(code)
      if (result.error) throw new Error(result.error)
      setMode('cancelled')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
      {error && (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      {mode === 'view' && (
        <div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 space-y-1.5">
            <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-white">
              {currentLabel}
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                  status === 'cancelled'
                    ? 'border-red-500/30 bg-red-500/10 text-red-300'
                    : status === 'completed'
                      ? 'border-slate-600/30 bg-slate-500/15 text-slate-400'
                      : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                }`}
              >
                {status}
              </span>
            </p>
            {clientName && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
                <User className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                {clientName}
              </p>
            )}
            {clientPhone && (
              <p className="flex items-center gap-1.5 text-sm tracking-wide text-slate-400">
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                {clientPhone}
              </p>
            )}
            <p className="flex items-center gap-1.5 text-sm text-emerald-300/90">
              <Tag className="h-3.5 w-3.5 shrink-0 text-emerald-400/60" aria-hidden />
              {serviceName}
            </p>
            <p className="text-xs text-slate-500">with {staffName}</p>
          </div>

          {isActive ? (
            <div className="mt-4 flex gap-3">
              <button
                onClick={startReschedule}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-emerald-400 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Reschedule
              </button>
              <button
                onClick={() => setMode('cancel-confirm')}
                className="flex-1 rounded-xl border border-red-500/20 py-2.5 text-sm font-semibold text-red-300 transition hover:border-red-400"
              >
                Cancel booking
              </button>
            </div>
          ) : (
            <p className="mt-4 text-center text-sm text-slate-500">This booking can no longer be changed.</p>
          )}
        </div>
      )}

      {mode === 'cancel-confirm' && (
        <div>
          <p className="text-sm text-slate-300">
            Cancel your {serviceName} appointment on {currentLabel} with {staffName}?
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={doCancel}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-red-400 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Yes, cancel it
            </button>
            <button
              onClick={() => setMode('view')}
              className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-emerald-400"
            >
              Never mind
            </button>
          </div>
        </div>
      )}

      {mode === 'date' && (
        <div>
          <button
            onClick={() => setMode('view')}
            className="mb-4 text-xs font-medium text-slate-500 transition hover:text-emerald-400"
          >
            ← Back
          </button>
          {availableDateKeys.size === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center text-sm text-slate-400">
              No open slots in the next 2 weeks — please message {businessName} directly.
            </p>
          ) : (
            <MonthCalendar
              cursor={monthCursor}
              onNavigate={setMonthCursor}
              availableDateKeys={availableDateKeys}
              todayKey={todayKey}
              onPick={pickDate}
            />
          )}
        </div>
      )}

      {mode === 'time' && selectedDate && (
        <div>
          <button
            onClick={() => setMode('date')}
            className="mb-4 text-xs font-medium text-slate-500 transition hover:text-emerald-400"
          >
            ← Change date
          </button>
          <p className="mb-4 text-sm font-medium text-slate-300">{dateLabelInTz(selectedDate, timezone)}</p>
          <div className="grid grid-cols-3 gap-2.5">
            {timesForSelectedDate.map((group) => (
              <button
                key={group.startsAt}
                onClick={() => pickTime(group)}
                disabled={loading}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-center text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-emerald-500/[0.06] disabled:opacity-50"
              >
                {timeInTz(group.startsAt, timezone)}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'staff' && (
        <div>
          <button
            onClick={() => setMode('time')}
            className="mb-4 text-xs font-medium text-slate-500 transition hover:text-emerald-400"
          >
            ← Change time
          </button>
          <p className="mb-4 text-sm font-medium text-slate-300">Who would you like to see?</p>
          <div className="space-y-2.5">
            {candidateSlots.map((s) => (
              <button
                key={s.staffId}
                onClick={() => confirmReschedule(s)}
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3.5 text-left font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-white/[0.05] disabled:opacity-50"
              >
                {s.staffName}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'cancelled' && (
        <div className="py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-400/30">
            <CircleCheck className="h-7 w-7 text-red-300" aria-hidden />
          </div>
          <p className="mt-4 text-lg font-semibold text-white">Booking cancelled</p>
          <p className="mt-1.5 text-sm text-slate-400">
            Your appointment with {businessName} has been cancelled.
          </p>
        </div>
      )}

      {mode === 'rescheduled' && (
        <div className="py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/30">
            <CircleCheck className="h-7 w-7 text-emerald-300" aria-hidden />
          </div>
          <p className="mt-4 text-lg font-semibold text-white">Booking rescheduled!</p>
          <p className="mt-1.5 text-sm text-slate-400">
            New time: {finalLabel}. See you at {businessName}!
          </p>
        </div>
      )}
    </div>
  )
}
