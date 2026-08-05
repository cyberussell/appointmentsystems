'use client'

import { useEffect } from 'react'
import { TriangleAlert } from 'lucide-react'

export default function DashboardErrorFallback({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
      <TriangleAlert className="h-8 w-8 text-amber-400" aria-hidden />
      <h2 className="font-semibold text-white">Something went wrong</h2>
      <p className="max-w-sm text-sm text-slate-400">
        This page hit an unexpected error. You can try again, or head back if it keeps happening.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
      >
        Try again
      </button>
    </div>
  )
}
