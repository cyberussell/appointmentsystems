function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-800 ${className}`} />
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-6 w-40" />
          <Shimmer className="h-4 w-64" />
        </div>
        <Shimmer className="h-9 w-36 rounded-lg" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-4 py-3">
          <Shimmer className="h-4 w-full max-w-md" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-slate-800/60 px-4 py-4 last:border-0">
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-4 w-20" />
            <Shimmer className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
