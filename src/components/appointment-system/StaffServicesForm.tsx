'use client'

import { setStaffServices } from '@/app/appointments/actions'
import type { Service } from '@/lib/appointment-system/types'
import SubmitButton from './SubmitButton'

export default function StaffServicesForm({
  staffId,
  services,
  selectedServiceIds,
}: {
  staffId: string
  services: Service[]
  selectedServiceIds: string[]
}) {
  if (services.length === 0) return null

  return (
    <form action={setStaffServices} className="mt-2 space-y-1.5">
      <input type="hidden" name="staff_id" value={staffId} />
      <p className="text-xs font-medium text-slate-500">Can perform (leave all unchecked for &quot;any service&quot;):</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {services.map((s) => (
          <label key={s.id} className="flex items-center gap-1.5 text-xs text-slate-300">
            <input
              type="checkbox"
              name="service_id"
              value={s.id}
              defaultChecked={selectedServiceIds.includes(s.id)}
              className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
            />
            {s.name}
          </label>
        ))}
      </div>
      <SubmitButton
        pendingText="Saving…"
        className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-emerald-400 transition"
      >
        Save
      </SubmitButton>
    </form>
  )
}
