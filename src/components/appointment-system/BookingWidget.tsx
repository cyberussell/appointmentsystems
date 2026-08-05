'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, CircleCheck, Clock, Loader2 } from 'lucide-react'
import type { Service, Slot } from '@/lib/appointment-system/types'
import MonthCalendar, { dateKeyInTz, timeInTz, dateLabelInTz } from './MonthCalendar'

type Step = 'service' | 'date' | 'time' | 'staff' | 'details' | 'done'

const PROGRESS_STAGE: Record<Step, number> = { service: 0, date: 1, time: 1, staff: 1, details: 2, done: 3 }

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder:text-slate-500 transition focus:border-emerald-400/50 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-emerald-400/10'

interface TimeGroup {
  startsAt: string
  slots: Slot[]
}

export default function BookingWidget({
  businessSlug,
  services,
  businessNoun = 'clinic',
  showStaffNames = true,
  timezone,
}: {
  businessSlug: string
  services: Service[]
  businessNoun?: string
  showStaffNames?: boolean
  timezone: string
}) {
  const [step, setStep] = useState<Step>('service')
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [loadingServiceId, setLoadingServiceId] = useState<string | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [candidateSlots, setCandidateSlots] = useState<Slot[]>([])
  const [slot, setSlot] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booked, setBooked] = useState<{ referenceCode: string; manageUrl: string; qrDataUrl: string } | null>(null)

  const todayKey = useMemo(() => dateKeyInTz(new Date().toISOString(), timezone), [timezone])
  const [monthCursor, setMonthCursor] = useState(() => {
    const [y, m] = todayKey.split('-').map(Number)
    return { year: y, month: m - 1 }
  })

  async function pickService(id: string) {
    setServiceId(id)
    setLoadingServiceId(id)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/appointments/api/book?business=${encodeURIComponent(businessSlug)}&service=${encodeURIComponent(id)}`
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load slots')
      setSlots(data.slots ?? [])
      setStep('date')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
      setLoadingServiceId(null)
    }
  }

  const availableDateKeys = useMemo(() => {
    const set = new Set<string>()
    for (const s of slots) set.add(dateKeyInTz(s.startsAt, timezone))
    return set
  }, [slots, timezone])

  function pickDate(dateKey: string) {
    setSelectedDate(dateKey)
    setStep('time')
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

  function pickTime(group: TimeGroup) {
    const uniqueStaff = new Set(group.slots.map((s) => s.staffId))
    if (uniqueStaff.size <= 1) {
      setSlot(group.slots[0])
      setStep('details')
    } else {
      setCandidateSlots(group.slots)
      setStep('staff')
    }
  }

  function pickStaff(s: Slot) {
    setSlot(s)
    setStep('details')
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!serviceId || !slot) return
    const form = new FormData(e.currentTarget)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/appointments/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug,
          serviceId,
          staffId: slot.staffId,
          startsAt: slot.startsAt,
          fullName: String(form.get('fullName') ?? ''),
          phone: String(form.get('phone') ?? ''),
          note: String(form.get('note') ?? '') || undefined,
        }),
      })
      const data = await res.json()
      if (res.status === 409) {
        await pickService(serviceId)
        setError('That slot was just taken — please pick another one.')
        return
      }
      if (res.status === 403) {
        setError(data.error ?? 'This booking is not allowed.')
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Booking failed')
      setBooked({ referenceCode: data.referenceCode, manageUrl: data.manageUrl, qrDataUrl: data.qrDataUrl })
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (services.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400 shadow-[0_8px_30px_rgb(0,0,0,0.35)] backdrop-blur-xl">
        Online booking isn&apos;t set up yet — please message or call the {businessNoun} directly.
      </p>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
      <div className="mb-6 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= PROGRESS_STAGE[step] ? 'bg-emerald-400' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      {step === 'service' && (
        <div className="space-y-3">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => pickService(s.id)}
              disabled={loading}
              className="group flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-emerald-500/5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <div className="min-w-0">
                <p className="font-semibold text-white">{s.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {s.duration_min} min
                  <span className="text-slate-600">·</span>
                  <span className="font-medium text-slate-300">₱{Number(s.price).toLocaleString('en-PH')}</span>
                </p>
              </div>
              {loadingServiceId === s.id ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-400" aria-hidden />
              ) : (
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-slate-600 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-emerald-400"
                  aria-hidden
                />
              )}
            </button>
          ))}
        </div>
      )}

      {step === 'date' && (
        <div>
          <button
            onClick={() => setStep('service')}
            className="mb-4 text-xs font-medium text-slate-500 transition hover:text-emerald-400"
          >
            ← Change service
          </button>
          {availableDateKeys.size === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center text-sm text-slate-400">
              No open slots in the next 2 weeks — please message the {businessNoun} directly.
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

      {step === 'time' && selectedDate && (
        <div>
          <button
            onClick={() => setStep('date')}
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
                className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-center text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-emerald-500/[0.06] hover:shadow-lg hover:shadow-emerald-500/5"
              >
                {timeInTz(group.startsAt, timezone)}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'staff' && (
        <div>
          <button
            onClick={() => setStep('time')}
            className="mb-4 text-xs font-medium text-slate-500 transition hover:text-emerald-400"
          >
            ← Change time
          </button>
          <p className="mb-4 text-sm font-medium text-slate-300">Who would you like to see?</p>
          <div className="space-y-2.5">
            {candidateSlots.map((s) => (
              <button
                key={s.staffId}
                onClick={() => pickStaff(s)}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3.5 text-left font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-white/[0.05] hover:shadow-lg hover:shadow-emerald-500/5"
              >
                {s.staffName}
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-slate-600 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-emerald-400"
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'details' && slot && (
        <form onSubmit={submit} className="space-y-4">
          <button
            type="button"
            onClick={() => setStep('time')}
            className="text-xs font-medium text-slate-500 transition hover:text-emerald-400"
          >
            ← Change time
          </button>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
            <span className="text-slate-500">Booking</span>
            <p className="mt-0.5 font-medium text-white">
              {slot.label}
              {showStaffNames ? ` with ${slot.staffName}` : ''}
            </p>
          </div>
          <input name="fullName" required minLength={2} placeholder="Full name" className={inputClass} />
          <input
            name="phone"
            type="tel"
            required
            inputMode="numeric"
            pattern="^09[0-9]{9}$"
            maxLength={11}
            title="Enter an 11-digit mobile number starting with 09 (e.g. 09171234567)"
            placeholder="Mobile number (09XXXXXXXXX)"
            className={inputClass}
          />
          <textarea
            name="note"
            rows={2}
            placeholder={`Anything the ${businessNoun} should know? (optional)`}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:bg-emerald-400 hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {loading ? 'Booking…' : 'Confirm booking'}
          </button>
        </form>
      )}

      {step === 'done' && (
        <div className="py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/30">
            <CircleCheck className="h-7 w-7 text-emerald-300" aria-hidden />
          </div>
          <p className="mt-4 text-lg font-semibold text-white">You&apos;re booked!</p>
          <p className="mt-1.5 text-sm text-slate-400">
            {slot?.label}
            {showStaffNames ? ` with ${slot?.staffName}` : ''}. See you!
          </p>

          {booked && (
            <div className="mx-auto mt-6 max-w-xs rounded-xl border border-white/10 bg-white/[0.02] p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={booked.qrDataUrl} alt="QR code to manage your booking" className="mx-auto h-32 w-32" />
              <p className="mt-3 text-xs text-slate-500">Reference code</p>
              <p className="font-mono text-lg font-semibold tracking-widest text-white">{booked.referenceCode}</p>
              <a
                href={booked.manageUrl}
                className="mt-3 inline-block text-xs font-medium text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
              >
                Manage this booking
              </a>
              <p className="mt-2 text-[11px] text-slate-600">Save this to cancel or reschedule later.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
