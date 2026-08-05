// Always-visible usage bar (not just at 80%+ like UsageBanner) — Phase 4's
// "plan awareness should be ambient, not just a warning at the limit" rule.
export default function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  if (limit === null) {
    return (
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wide">
          <span>{label}</span>
          <span>{used} used</span>
        </div>
        <p className="mt-1.5 text-sm text-emerald-300">Unlimited</p>
      </div>
    )
  }

  const pct = Math.min(100, Math.round((used / limit) * 100))
  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wide">
        <span>{label}</span>
        <span>
          {used} / {limit}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
