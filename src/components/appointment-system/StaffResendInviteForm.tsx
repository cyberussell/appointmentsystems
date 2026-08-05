'use client'

import { useActionState } from 'react'
import { resendStaffInvite, type ActionResult } from '@/app/appointments/actions'

export default function StaffResendInviteForm({ staffId }: { staffId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(resendStaffInvite, {})

  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="staff_id" value={staffId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:border-emerald-400 disabled:opacity-50 transition"
      >
        {pending ? 'Resending…' : 'Resend invite'}
      </button>
      {state.error && <p className="text-xs text-red-400">{state.error}</p>}
    </form>
  )
}
