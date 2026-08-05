'use client'

import { useActionState, useEffect, useRef } from 'react'
import { createManualAppointment, type ActionResult } from '@/app/appointments/actions'
import type { Service, Staff } from '@/lib/appointment-system/types'

export default function ManualAppointmentForm({
  services,
  staff,
  clientLabel = 'Client',
  providerNoun = 'doctor',
}: {
  services: Service[]
  staff: Staff[]
  clientLabel?: string
  providerNoun?: string
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createManualAppointment,
    { error: undefined }
  )
  const formRef = useRef<HTMLFormElement>(null)
  const submitted = useRef(false)

  useEffect(() => {
    if (submitted.current && !pending && !state.error) formRef.current?.reset()
    if (!pending) submitted.current = false
  }, [pending, state.error])

  if (services.length === 0 || staff.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Add at least one service and one staff member before creating appointments manually.
      </p>
    )
  }

  return (
    <form
      ref={formRef}
      action={(fd) => {
        submitted.current = true
        formAction(fd)
      }}
      className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3"
    >
      <p className="text-sm font-semibold text-slate-300">Add appointment (walk-in / phone)</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="fullName"
          required
          placeholder={`${clientLabel} name`}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        />
        <input
          name="phone"
          placeholder="Mobile number (optional)"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        />
        <select
          name="service_id"
          required
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.duration_min} min)
            </option>
          ))}
        </select>
        <select
          name="staff_id"
          required
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        >
          {staff.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input
          name="starts_at"
          type="datetime-local"
          required
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        />
        <input
          name="note"
          placeholder={`Note for the ${providerNoun} (optional)`}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        />
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
      >
        {pending ? 'Adding…' : 'Add appointment'}
      </button>
    </form>
  )
}
