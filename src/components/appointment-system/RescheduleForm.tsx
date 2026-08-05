'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { rescheduleAppointment, type ActionResult } from '@/app/appointments/actions'

export default function RescheduleForm({ appointmentId }: { appointmentId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    rescheduleAppointment,
    { error: undefined }
  )
  const submitted = useRef(false)

  useEffect(() => {
    if (submitted.current && !pending && !state.error) setOpen(false)
    if (!pending) submitted.current = false
  }, [pending, state.error])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Reschedule"
        aria-label="Reschedule"
        className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:border-emerald-400 hover:text-emerald-300 transition"
      >
        <CalendarClock className="h-4 w-4" aria-hidden />
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
        name="starts_at"
        type="datetime-local"
        required
        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs focus:border-emerald-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
      >
        {pending ? 'Moving…' : 'Move'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-slate-500 hover:text-slate-300"
      >
        Cancel
      </button>
      {state.error && <p className="w-full text-xs text-red-400">{state.error}</p>}
    </form>
  )
}
