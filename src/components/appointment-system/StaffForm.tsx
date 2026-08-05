'use client'

import { useActionState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createStaff, type ActionResult } from '@/app/appointments/actions'

export default function StaffForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(createStaff, {})
  const formRef = useRef<HTMLFormElement>(null)
  const submitted = useRef(false)

  useEffect(() => {
    if (submitted.current && !pending && !state.error) formRef.current?.reset()
    if (!pending) submitted.current = false
  }, [pending, state.error])

  const atLimit = Boolean(state.error?.includes("You've reached your limit"))

  return (
    <form
      ref={formRef}
      action={(fd) => {
        submitted.current = true
        formAction(fd)
      }}
      className="rounded-xl border border-slate-800 bg-slate-900 p-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
    >
      <input
        name="name"
        required
        placeholder="Name (e.g. Dr. Santos)"
        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
      />
      <input
        name="title"
        placeholder="Title (e.g. Dentist)"
        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
      >
        {pending ? 'Adding…' : 'Add staff'}
      </button>
      {state.error && (
        <p className="sm:col-span-3 text-sm text-red-400">
          {state.error}
          {atLimit && (
            <>
              {' '}
              <Link href="/appointments#pricing" className="font-semibold underline underline-offset-4">
                Compare plans
              </Link>
              .
            </>
          )}
        </p>
      )}
    </form>
  )
}
