'use client'

import { useActionState } from 'react'
import { CircleCheck } from 'lucide-react'
import { changePassword, type ActionResult } from '@/app/appointments/actions'

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(changePassword, {})
  const success = state.error === 'DONE'

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
      <label className="block">
        <span className="text-sm text-slate-300">New password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm text-slate-300">Confirm new password</span>
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
        />
      </label>
      {state.error && !success && <p className="text-sm text-red-400">{state.error}</p>}
      {success && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-400">
          <CircleCheck className="h-3.5 w-3.5" aria-hidden />
          Password updated
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
      >
        {pending ? 'Updating…' : 'Change password'}
      </button>
    </form>
  )
}
