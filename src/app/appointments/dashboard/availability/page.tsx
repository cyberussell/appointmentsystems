import { requireBusiness } from '@/lib/appointment-system/auth'
import {
  addAvailability,
  deleteAvailability,
  addAvailabilityBreak,
  deleteAvailabilityBreak,
  addBlockedDate,
  deleteBlockedDate,
} from '../../actions'

export const dynamic = 'force-dynamic'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default async function AvailabilityPage() {
  const { supabase, business } = await requireBusiness()
  const [staffRes, availRes, breaksRes, blockedRes] = await Promise.all([
    supabase.from('staff').select('*').eq('business_id', business.id).eq('active', true).order('created_at'),
    supabase.from('availability').select('*, staff(name)').eq('business_id', business.id),
    supabase.from('availability_breaks').select('*, staff(name)').eq('business_id', business.id),
    supabase
      .from('blocked_dates')
      .select('*, staff(name)')
      .eq('business_id', business.id)
      .order('date'),
  ])
  const staff = staffRes.data ?? []
  const availability = (availRes.data ?? []).sort(
    (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
  )
  const breaks = (breaksRes.data ?? []).sort(
    (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
  )
  const blockedDates = blockedRes.data ?? []

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Weekly availability</h1>
        <p className="text-slate-400 text-sm mt-1">
          Open slots are generated from these working hours minus breaks, blocked dates, and booked appointments.
        </p>
      </div>

      {staff.length === 0 ? (
        <p className="text-slate-400 text-sm">Add staff first, then set their working hours here.</p>
      ) : (
        <form
          action={addAvailability}
          className="rounded-xl border border-slate-800 bg-slate-900 p-4 grid gap-3 sm:grid-cols-[1fr_1fr_120px_120px_auto]"
        >
          <select
            name="staff_id"
            required
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
          >
            {staff.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            name="day_of_week"
            required
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <input
            name="start_time"
            type="time"
            required
            defaultValue="09:00"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
          />
          <input
            name="end_time"
            type="time"
            required
            defaultValue="17:00"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
          />
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
            Add hours
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {availability.map((w) => (
          <li
            key={w.id}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between gap-3"
          >
            <p className="text-sm">
              <span className="font-medium">{w.staff?.name}</span>
              <span className="text-slate-400">
                {' '}
                · {DAYS[w.day_of_week]} · {w.start_time.slice(0, 5)}–{w.end_time.slice(0, 5)}
              </span>
            </p>
            <form action={deleteAvailability}>
              <input type="hidden" name="id" value={w.id} />
              <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-red-400 hover:border-red-400 transition">
                Remove
              </button>
            </form>
          </li>
        ))}
        {availability.length === 0 && staff.length > 0 && (
          <li className="text-slate-500 text-sm">No working hours yet — add the first window above.</li>
        )}
      </ul>

      {/* ── Breaks ── */}
      <div>
        <h2 className="text-xl font-bold">Breaks</h2>
        <p className="text-slate-400 text-sm mt-1">
          Recurring weekly holes in a staff member&apos;s schedule — lunch, prayer time, etc. Slots inside a
          break are never offered for booking.
        </p>
      </div>

      {staff.length > 0 && (
        <form
          action={addAvailabilityBreak}
          className="rounded-xl border border-slate-800 bg-slate-900 p-4 grid gap-3 sm:grid-cols-[1fr_1fr_120px_120px_auto]"
        >
          <select
            name="staff_id"
            required
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
          >
            {staff.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            name="day_of_week"
            required
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <input
            name="start_time"
            type="time"
            required
            defaultValue="12:00"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
          />
          <input
            name="end_time"
            type="time"
            required
            defaultValue="13:00"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
          />
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
            Add break
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {breaks.map((b) => (
          <li
            key={b.id}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between gap-3"
          >
            <p className="text-sm">
              <span className="font-medium">{b.staff?.name}</span>
              <span className="text-slate-400">
                {' '}
                · {DAYS[b.day_of_week]} · {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
              </span>
            </p>
            <form action={deleteAvailabilityBreak}>
              <input type="hidden" name="id" value={b.id} />
              <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-red-400 hover:border-red-400 transition">
                Remove
              </button>
            </form>
          </li>
        ))}
        {breaks.length === 0 && staff.length > 0 && (
          <li className="text-slate-500 text-sm">No breaks set.</li>
        )}
      </ul>

      {/* ── Blocked dates ── */}
      <div>
        <h2 className="text-xl font-bold">Blocked dates</h2>
        <p className="text-slate-400 text-sm mt-1">
          One-off closures — a holiday, a staff member&apos;s day off. Pick a staff member to block just their
          calendar, or leave it as &quot;Whole business&quot; to close everyone for the day.
        </p>
      </div>

      <form
        action={addBlockedDate}
        className="rounded-xl border border-slate-800 bg-slate-900 p-4 grid gap-3 sm:grid-cols-[1fr_140px_1fr_auto]"
      >
        <select
          name="staff_id"
          defaultValue=""
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        >
          <option value="">Whole business</option>
          {staff.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input
          name="date"
          type="date"
          required
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        />
        <input
          name="reason"
          placeholder="Reason (optional)"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        />
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
          Block date
        </button>
      </form>

      <ul className="space-y-2">
        {blockedDates.map((b) => (
          <li
            key={b.id}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between gap-3"
          >
            <p className="text-sm">
              <span className="font-medium">{b.staff?.name ?? 'Whole business'}</span>
              <span className="text-slate-400">
                {' '}
                · {b.date}
                {b.reason && <> · {b.reason}</>}
              </span>
            </p>
            <form action={deleteBlockedDate}>
              <input type="hidden" name="id" value={b.id} />
              <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-red-400 hover:border-red-400 transition">
                Remove
              </button>
            </form>
          </li>
        ))}
        {blockedDates.length === 0 && <li className="text-slate-500 text-sm">No blocked dates.</li>}
      </ul>
    </div>
  )
}
