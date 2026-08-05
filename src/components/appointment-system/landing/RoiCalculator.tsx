'use client'

import { useRef, useState } from 'react'
import { track } from './track'

const PLAN_COSTS = [
  { label: 'Basic — ₱299/mo', value: 299 },
  { label: 'Pro — ₱699/mo', value: 699 },
]

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`

export default function RoiCalculator() {
  const [avgValue, setAvgValue] = useState(500)
  const [extraBookings, setExtraBookings] = useState(10)
  const [planCost, setPlanCost] = useState(699)
  const tracked = useRef(false)

  const revenue = Math.max(0, avgValue) * Math.max(0, extraBookings)
  const diff = revenue - planCost
  const breakEven = avgValue > 0 ? Math.ceil(planCost / avgValue) : null

  function onUse() {
    if (!tracked.current) {
      tracked.current = true
      track('roi_calculator_used', {})
    }
  }

  return (
    <div className="as-glass-strong rounded-2xl p-5 sm:p-7">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-300">Average value of one booking (₱)</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={avgValue}
              onChange={(e) => { onUse(); setAvgValue(Number(e.target.value)) }}
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-300">Possible extra bookings per month</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={extraBookings}
              onChange={(e) => { onUse(); setExtraBookings(Number(e.target.value)) }}
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-300">Plan</span>
            <select
              value={planCost}
              onChange={(e) => { onUse(); setPlanCost(Number(e.target.value)) }}
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none [&>option]:bg-slate-900"
            >
              {PLAN_COSTS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col justify-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-5">
          <Row label="Estimated additional revenue" value={peso(revenue)} accent="text-emerald-300" />
          <Row label="Subscription cost" value={`− ${peso(planCost)}`} accent="text-slate-300" />
          <div className="border-t border-white/10 pt-3">
            <Row
              label="Difference"
              value={`${diff >= 0 ? '+' : '−'} ${peso(Math.abs(diff))}`}
              accent={diff >= 0 ? 'text-amber-300' : 'text-red-300'}
              big
            />
          </div>
          {breakEven !== null && (
            <p className="text-xs text-slate-400">
              The subscription pays for itself after about <strong className="text-slate-200">{breakEven} booking{breakEven === 1 ? '' : 's'}</strong> at that value.
            </p>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Estimates only, based on the numbers you enter. The system does not guarantee additional bookings or revenue.
      </p>
    </div>
  )
}

function Row({ label, value, accent, big }: { label: string; value: string; accent: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`font-bold ${accent} ${big ? 'text-2xl' : 'text-base'}`}>{value}</span>
    </div>
  )
}
