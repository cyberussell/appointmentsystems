'use client'

import { useActionState } from 'react'
import { inviteStaffLogin, type ActionResult } from '@/app/appointments/actions'

export default function StaffInviteForm({ staffId }: { staffId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(inviteStaffLogin, {})

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="staff_id" value={staffId} />
      <input
        name="email"
        type="email"
        required
        placeholder="Email to invite"
        className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs focus:border-emerald-400 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 transition"
      >
        {pending ? 'Sending…' : 'Invite to log in'}
      </button>
      {state.error && <p className="w-full text-xs text-red-400">{state.error}</p>}
    </form>
  )
}
