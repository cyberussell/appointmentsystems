'use client'

import { useActionState } from 'react'
import { CircleCheck } from 'lucide-react'
import { updateClientNotes, type ActionResult } from '@/app/appointments/actions'

export default function ClientNotesForm({ clientId, notes }: { clientId: string; notes: string | null }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(updateClientNotes, {})
  const success = state.error === 'DONE'

  return (
    <form action={formAction} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      <input type="hidden" name="id" value={clientId} />
      <p className="text-sm font-semibold text-slate-300">Internal notes</p>
      <textarea
        name="notes"
        rows={3}
        defaultValue={notes ?? ''}
        placeholder="Allergies, preferences, treatment plan, balance owed…"
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
      />
      {state.error && !success && <p className="text-sm text-red-400">{state.error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
        >
          {pending ? 'Saving…' : 'Save notes'}
        </button>
        {success && !pending && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-400">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden />
            Saved
          </span>
        )}
      </div>
    </form>
  )
}
