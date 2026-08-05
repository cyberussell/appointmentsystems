'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Banknote, CircleCheck } from 'lucide-react'
import { recordPayment, type ActionResult } from '@/app/appointments/actions'

export default function RecordPaymentForm({
  appointmentId,
  defaultAmount,
  paidAmount,
  paidLabel,
  today,
}: {
  appointmentId: string
  defaultAmount: number
  paidAmount: number
  paidLabel: string | null // e.g. "Jul 4, 2026", null when unpaid
  today: string // YYYY-MM-DD in business timezone
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(recordPayment, {})
  const submitted = useRef(false)

  useEffect(() => {
    if (submitted.current && !pending && !state.error) setOpen(false)
    if (!pending) submitted.current = false
  }, [pending, state.error])

  if (!open) {
    return paidAmount > 0 ? (
      <button
        onClick={() => setOpen(true)}
        title="Edit payment"
        className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25 transition"
      >
        <CircleCheck className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />
        Paid ₱{Number(paidAmount).toLocaleString('en-PH')}
        {paidLabel && <span className="opacity-75"> · {paidLabel}</span>}
      </button>
    ) : (
      <button
        onClick={() => setOpen(true)}
        title="Record payment"
        aria-label="Record payment"
        className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:border-emerald-400 hover:text-emerald-300 transition"
      >
        <Banknote className="h-4 w-4" aria-hidden />
      </button>
    )
  }

  return (
    <form
      action={(fd) => {
        submitted.current = true
        formAction(fd)
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="id" value={appointmentId} />
      <input
        name="amount"
        type="number"
        min={0}
        step={1}
        required
        defaultValue={paidAmount > 0 ? paidAmount : defaultAmount}
        placeholder="Amount ₱"
        className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs focus:border-emerald-400 focus:outline-none"
      />
      <input
        name="paid_date"
        type="date"
        required
        defaultValue={today}
        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs focus:border-emerald-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-300">
        Cancel
      </button>
      {state.error && <p className="w-full text-xs text-red-400">{state.error}</p>}
    </form>
  )
}
