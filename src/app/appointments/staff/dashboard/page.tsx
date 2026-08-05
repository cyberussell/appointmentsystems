import { MessageCircle, NotebookText } from 'lucide-react'
import { requireStaffAccess } from '@/lib/appointment-system/auth'
import { getTerms } from '@/lib/appointment-system/terminology'
import { formatSlotLabel, wallTimeToUtc } from '@/lib/appointment-system/slots'
import RecordPaymentForm from '@/components/appointment-system/RecordPaymentForm'
import { updateAppointmentStatus } from '../../actions'

export const dynamic = 'force-dynamic'

function dateKeyInTz(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

export default async function StaffTodayPage() {
  const { supabase, business } = await requireStaffAccess()
  const t = getTerms(business.business_types)

  const now = new Date()
  const todayKey = dateKeyInTz(now.toISOString(), business.timezone)
  const dayStart = wallTimeToUtc(`${todayKey}T00:00`, business.timezone)!
  const dayEnd = new Date(dayStart.getTime() + 86400_000)

  const [ty, tm, td] = todayKey.split('-').map(Number)
  const noon = new Date(Date.UTC(ty, tm - 1, td, 12))
  const mondayKey = new Date(noon.getTime() - ((noon.getUTCDay() + 6) % 7) * 86400_000)
    .toISOString()
    .slice(0, 10)
  const weekStart = wallTimeToUtc(`${mondayKey}T00:00`, business.timezone)!
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400_000)
  const last30 = new Date(now.getTime() - 30 * 86400_000)

  const [todayRes, weekRes, completedRes, noShowRes, clientsRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('*, clients(full_name, phone), services(name, price), staff(name)')
      .eq('business_id', business.id)
      .gte('starts_at', dayStart.toISOString())
      .lt('starts_at', dayEnd.toISOString())
      .order('starts_at'),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .in('status', ['pending', 'confirmed', 'completed'])
      .gte('starts_at', weekStart.toISOString())
      .lt('starts_at', weekEnd.toISOString()),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'completed')
      .gte('starts_at', last30.toISOString()),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'no_show')
      .gte('starts_at', last30.toISOString()),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('created_at', last30.toISOString()),
  ])

  const todayAppts = todayRes.data ?? []
  const activeToday = todayAppts.filter((a) => a.status === 'pending' || a.status === 'confirmed')
  const completed = completedRes.count ?? 0
  const noShows = noShowRes.count ?? 0
  const noShowRate = completed + noShows > 0 ? Math.round((noShows / (completed + noShows)) * 100) : 0

  const stats = [
    { label: 'Today', value: String(activeToday.length), sub: 'appointments left today' },
    { label: 'This week', value: String(weekRes.count ?? 0), sub: 'booked this week' },
    { label: 'Completed', value: String(completed), sub: 'last 30 days' },
    { label: 'No-show rate', value: `${noShowRate}%`, sub: `${noShows} no-shows in 30 days` },
    { label: `New ${t.clients}`, value: String(clientsRes.count ?? 0), sub: 'last 30 days' },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Today</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Today&apos;s schedule</h2>
        {todayAppts.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            <p>No appointments today.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {todayAppts.map((a) => (
              <li
                key={a.id}
                className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3 ${
                  a.status === 'confirmed' || a.status === 'pending'
                    ? 'border-slate-800 bg-slate-900'
                    : 'border-slate-800/60 bg-slate-900/40 opacity-60'
                }`}
              >
                <div>
                  <p className="font-semibold">
                    {formatSlotLabel(a.starts_at, business.timezone)}{' '}
                    <span className="text-slate-400 font-normal">· {a.services?.name}</span>
                    {a.status !== 'confirmed' && a.status !== 'pending' && (
                      <span className="ml-2 text-xs text-slate-500">({a.status})</span>
                    )}
                  </p>
                  <p className="text-sm text-slate-400">
                    {a.clients?.full_name || 'Unknown ' + t.client} · {a.clients?.phone || 'no phone'} · with{' '}
                    {a.staff?.name}
                    {a.source === 'messenger' && (
                      <span className="inline-flex items-center gap-1">
                        {' '}· via Messenger <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    )}
                  </p>
                  {a.intake_note && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-300/80">
                      <NotebookText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {a.intake_note}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {a.status !== 'cancelled' && a.status !== 'no_show' && (
                    <RecordPaymentForm
                      appointmentId={a.id}
                      defaultAmount={Number(a.services?.price ?? 0)}
                      paidAmount={Number(a.amount_paid ?? 0)}
                      paidLabel={
                        a.paid_at
                          ? new Date(a.paid_at).toLocaleDateString('en-PH', {
                              timeZone: business.timezone,
                              month: 'short',
                              day: 'numeric',
                            })
                          : null
                      }
                      today={todayKey}
                    />
                  )}
                  {(a.status === 'confirmed' || a.status === 'pending') && (
                    <>
                      <StatusButton id={a.id} status="completed" label="Done" />
                      <StatusButton id={a.id} status="no_show" label="No-show" />
                      <StatusButton id={a.id} status="cancelled" label="Cancel" />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatusButton({ id, status, label }: { id: string; status: string; label: string }) {
  return (
    <form action={updateAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-400 hover:text-emerald-300 transition">
        {label}
      </button>
    </form>
  )
}
