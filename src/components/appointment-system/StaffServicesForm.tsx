'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
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
  const [selected, setSelected] = useState<string[]>(selectedServiceIds)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (services.length === 0) return null

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const summary =
    selected.length === 0
      ? 'Any service'
      : selected.length === services.length
        ? 'All services'
        : `${selected.length} service${selected.length === 1 ? '' : 's'} selected`

  return (
    <form action={setStaffServices} className="space-y-1.5">
      <input type="hidden" name="staff_id" value={staffId} />
      <p className="text-xs font-medium text-slate-500">Can perform</p>

      <div ref={ref} className="relative w-64 max-w-full">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-200 transition hover:border-emerald-400/50"
        >
          <span className={selected.length === 0 ? 'text-slate-500' : ''}>{summary}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>

        {open && (
          <div className="absolute z-10 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 p-1 shadow-xl shadow-black/30">
            {services.map((s) => {
              const checked = selected.includes(s.id)
              return (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-200 transition hover:bg-slate-700/60"
                >
                  <input
                    type="checkbox"
                    name="service_id"
                    value={s.id}
                    checked={checked}
                    onChange={() => toggle(s.id)}
                    className="sr-only"
                  />
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                      checked ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                    }`}
                  >
                    {checked && <Check className="h-3 w-3 text-slate-950" aria-hidden />}
                  </span>
                  {s.name}
                </label>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-600">Leave empty for &quot;any service.&quot;</p>

      <SubmitButton
        pendingText="Saving…"
        className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:border-emerald-400"
      >
        Save
      </SubmitButton>
    </form>
  )
}
