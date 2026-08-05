import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, Hash, MessageCircle, NotebookText, Phone, Tag, User, UserX, XCircle } from 'lucide-react'
import { requireBusiness } from '@/lib/appointment-system/auth'
import { getTerms } from '@/lib/appointment-system/terminology'
import { formatSlotLabel, wallTimeToUtc } from '@/lib/appointment-system/slots'
import type { Service, Staff } from '@/lib/appointment-system/types'
import ManualAppointmentForm from '@/components/appointment-system/ManualAppointmentForm'
import RecordPaymentForm from '@/components/appointment-system/RecordPaymentForm'
import RescheduleForm from '@/components/appointment-system/RescheduleForm'
import AppointmentsMonthGrid, { type MonthDay } from '@/components/appointment-system/AppointmentsMonthGrid'
import UsageBanner from '@/components/appointment-system/UsageBanner'
import { canCreateAppointment } from '@/lib/appointment-system/entitlements'
import { updateAppointmentStatus } from '../../actions'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  completed: 'bg-slate-500/15 text-slate-400 border-slate-600/30',
  cancelled: 'bg-red-500/10 text-red-400/70 border-red-500/20',
  no_show: 'bg-red-500/15 text-red-300 border-red-500/30',
}

const ICON_BUTTON_CLASS =
  'rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:border-emerald-400 hover:text-emerald-300 transition'

const STATUS_ACTIONS: { status: string; label: string; Icon: LucideIcon }[] = [
  { status: 'completed', label: 'Completed', Icon: CheckCircle2 },
  { status: 'no_show', label: 'No-show', Icon: UserX },
  { status: 'cancelled', label: 'Cancelled', Icon: XCircle },
]

interface ApptRow {
  id: string
  starts_at: string
  status: string
  source: string
  intake_note: string
  amount_paid: number
  paid_at: string | null
  reference_code: string | null
  staff_id: string
  clients: { full_name: string; phone: string } | null
  services: { name: string; price: number } | null
  staff: { name: string } | null
}

function dateKeyInTz(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

function timeInTz(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** Monday (UTC-noon) on/before the given UTC-noon date. */
function mondayOf(dateUtcNoon: Date): Date {
  const dow = dateUtcNoon.getUTCDay()
  return new Date(dateUtcNoon.getTime() - ((dow + 6) % 7) * 86400_000)
}

function dominantStatus(statuses: string[]): MonthDay['dominant'] {
  if (statuses.includes('pending')) return 'pending'
  if (statuses.includes('confirmed')) return 'confirmed'
  if (statuses.includes('completed')) return 'completed'
  if (statuses.length > 0) return 'other'
  return null
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string; m?: string; view?: string; day?: string; staff?: string }>
}) {
  const { supabase, business } = await requireBusiness()
  const t = getTerms(business.business_types)
  const { w, m, view: viewParam, day: dayParam, staff: staffParam } = await searchParams
  const view = viewParam === 'month' ? 'month' : 'week'
  const weekOffset = Number(w ?? 0) || 0
  const monthOffset = Number(m ?? 0) || 0

  // Monday of the target week, in the business's timezone.
  const todayKey = dateKeyInTz(new Date().toISOString(), business.timezone)
  const [ty, tm, td] = todayKey.split('-').map(Number)
  const todayUtcNoon = new Date(Date.UTC(ty, tm - 1, td, 12))
  const thisWeekMonday = mondayOf(todayUtcNoon)
  const monday = new Date(thisWeekMonday.getTime() + weekOffset * 7 * 86400_000)

  const viewToggle = (
    <div className="flex items-center gap-1 rounded-lg border border-slate-700 p-0.5 text-sm">
      <Link
        href="/appointments/dashboard/appointments"
        className={`rounded px-3 py-1 transition ${
          view === 'week' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
        }`}
      >
        Week
      </Link>
      <Link
        href="/appointments/dashboard/appointments?view=month"
        className={`rounded px-3 py-1 transition ${
          view === 'month' ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
        }`}
      >
        Month
      </Link>
    </div>
  )

  const [svcRes, staffRes, quota] = await Promise.all([
    supabase.from('services').select('*').eq('business_id', business.id).eq('active', true).order('created_at'),
    supabase.from('staff').select('*').eq('business_id', business.id).eq('active', true).order('created_at'),
    canCreateAppointment(supabase, business),
  ])
  const usageBanner = <UsageBanner tier={business.plan_tier} used={quota.used} limit={quota.limit} />
  const manualBookingForm = (
    <ManualAppointmentForm
      clientLabel={t.Client}
      providerNoun={t.provider}
      services={(svcRes.data ?? []) as Service[]}
      staff={(staffRes.data ?? []) as Staff[]}
    />
  )

  if (view === 'month') {
    const baseMonth = new Date(Date.UTC(ty, tm - 1 + monthOffset, 1, 12))
    const y = baseMonth.getUTCFullYear()
    const mo = baseMonth.getUTCMonth()
    const firstOfMonth = new Date(Date.UTC(y, mo, 1, 12))
    const firstDow = (firstOfMonth.getUTCDay() + 6) % 7 // 0 = Monday
    const gridStart = new Date(firstOfMonth.getTime() - firstDow * 86400_000)
    const daysInMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate()
    const totalCells = firstDow + daysInMonth
    const weeks = Math.ceil(totalCells / 7)
    const gridDays = weeks * 7

    const gridStartUtc = wallTimeToUtc(`${gridStart.toISOString().slice(0, 10)}T00:00`, business.timezone)!
    const gridEndUtc = new Date(gridStartUtc.getTime() + gridDays * 86400_000)

    const { data: monthAppts } = await supabase
      .from('appointments')
      .select('starts_at, status')
      .eq('business_id', business.id)
      .gte('starts_at', gridStartUtc.toISOString())
      .lt('starts_at', gridEndUtc.toISOString())

    const statusesByDay = new Map<string, string[]>()
    for (const a of (monthAppts ?? []) as { starts_at: string; status: string }[]) {
      const key = dateKeyInTz(a.starts_at, business.timezone)
      const list = statusesByDay.get(key) ?? []
      list.push(a.status)
      statusesByDay.set(key, list)
    }

    const monthDays: MonthDay[] = Array.from({ length: gridDays }, (_, i) => {
      const d = new Date(gridStart.getTime() + i * 86400_000)
      const key = d.toISOString().slice(0, 10)
      const statuses = statusesByDay.get(key) ?? []
      const cellMonday = mondayOf(d)
      return {
        key,
        dayNum: d.getUTCDate(),
        isCurrentMonth: d.getUTCMonth() === mo,
        isToday: key === todayKey,
        weekOffset: Math.round((cellMonday.getTime() - thisWeekMonday.getTime()) / (7 * 86400_000)),
        total: statuses.length,
        dominant: dominantStatus(statuses),
      }
    })

    const monthLabel = baseMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric', timeZone: 'UTC' })

    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Appointments</h1>
          {viewToggle}
        </div>
        {usageBanner}
        <AppointmentsMonthGrid monthLabel={monthLabel} monthOffset={monthOffset} days={monthDays} />
        {manualBookingForm}
      </div>
    )
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getTime() + i * 86400_000)
    const key = d.toISOString().slice(0, 10)
    return {
      key,
      label: d.toLocaleDateString('en-PH', { weekday: 'short', timeZone: 'UTC' }),
      dayNum: d.getUTCDate(),
      isToday: key === todayKey,
    }
  })

  const weekStart = wallTimeToUtc(`${days[0].key}T00:00`, business.timezone)!
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400_000)

  const { data: weekApptData } = await supabase
    .from('appointments')
    .select(
      'id, starts_at, status, source, intake_note, amount_paid, paid_at, reference_code, staff_id, clients(full_name, phone), services(name, price), staff(name)'
    )
    .eq('business_id', business.id)
    .gte('starts_at', weekStart.toISOString())
    .lt('starts_at', weekEnd.toISOString())
    .order('starts_at')
  const appointments = (weekApptData ?? []) as unknown as ApptRow[]

  const byDay = new Map<string, ApptRow[]>(days.map((d) => [d.key, []]))
  for (const a of appointments) {
    byDay.get(dateKeyInTz(a.starts_at, business.timezone))?.push(a)
  }

  const monthLabel = new Date(monday.getTime() + 3 * 86400_000).toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const selectedDay = dayParam && days.find((d) => d.key === dayParam)
  const dayOrWeekAppointments = selectedDay ? (byDay.get(selectedDay.key) ?? []) : appointments
  const staffList = (staffRes.data ?? []) as Staff[]
  const selectedStaffId = staffList.some((s) => s.id === staffParam) ? (staffParam as string) : null
  const staffFiltered = selectedStaffId
    ? dayOrWeekAppointments.filter((a) => a.staff_id === selectedStaffId)
    : dayOrWeekAppointments
  // "All staff" groups by provider name first, then time within each provider's list.
  const visibleAppointments = selectedStaffId
    ? staffFiltered
    : [...staffFiltered].sort((a, b) => {
        const byStaff = (a.staff?.name ?? '').localeCompare(b.staff?.name ?? '')
        return byStaff !== 0 ? byStaff : a.starts_at.localeCompare(b.starts_at)
      })
  const listHeading = selectedDay
    ? new Date(monday.getTime() + days.findIndex((d) => d.key === selectedDay.key) * 86400_000).toLocaleDateString(
        'en-PH',
        { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }
      )
    : "This week's appointments"

  function apptListHref(staffId: string | null): string {
    const params = new URLSearchParams()
    if (weekOffset !== 0) params.set('w', String(weekOffset))
    if (selectedDay) params.set('day', selectedDay.key)
    if (staffId) params.set('staff', staffId)
    const qs = params.toString()
    return `/appointments/dashboard/appointments${qs ? `?${qs}` : ''}`
  }

  function staffPillClass(active: boolean): string {
    return `rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
      active
        ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
        : 'border-slate-700 text-slate-300 hover:border-emerald-400'
    }`
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-slate-400 text-sm mt-1">{monthLabel}</p>
        </div>
        {viewToggle}
        <div className="flex items-center gap-2">
          <Link
            href={`/appointments/dashboard/appointments?w=${weekOffset - 1}`}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-emerald-400 transition"
          >
            ← Prev
          </Link>
          <Link
            href="/appointments/dashboard/appointments"
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              weekOffset === 0
                ? 'border-emerald-400 text-emerald-300'
                : 'border-slate-700 text-slate-300 hover:border-emerald-400'
            }`}
          >
            This week
          </Link>
          <Link
            href={`/appointments/dashboard/appointments?w=${weekOffset + 1}`}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-emerald-400 transition"
          >
            Next →
          </Link>
        </div>
      </div>

      {usageBanner}

      {/* Week calendar */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="flex gap-1 sm:grid sm:grid-cols-7 sm:gap-2">
          {days.map((d) => (
            <div key={d.key} className="w-[104px] shrink-0 sm:w-auto">
              <div
                className={`rounded-t-lg px-2 py-1.5 text-center text-xs font-semibold ${
                  d.isToday ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-900 text-slate-400'
                }`}
              >
                {d.label} {d.dayNum}
              </div>
              <div
                className={`min-h-[140px] space-y-1 rounded-b-lg border border-t-0 p-1 ${
                  d.isToday ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                {(byDay.get(d.key) ?? []).slice(0, 4).map((a) => (
                  <div
                    key={a.id}
                    className={`rounded border px-1.5 py-1 text-[11px] leading-tight ${STATUS_STYLES[a.status] ?? ''}`}
                    title={`${a.clients?.full_name} · ${a.services?.name} · ${a.staff?.name} (${a.status})`}
                  >
                    <span className="font-semibold">{timeInTz(a.starts_at, business.timezone)}</span>
                    <span className="block truncate">{a.clients?.full_name || '—'}</span>
                    <span className="block truncate opacity-75">{a.services?.name}</span>
                  </div>
                ))}
                {(byDay.get(d.key) ?? []).length > 4 && (
                  <Link
                    href={`/appointments/dashboard/appointments?w=${weekOffset}&day=${d.key}`}
                    className="block rounded border border-slate-700 px-1.5 py-1 text-center text-[11px] font-medium text-slate-400 transition hover:border-emerald-400 hover:text-emerald-300"
                  >
                    +{(byDay.get(d.key) ?? []).length - 4} more
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual booking */}
      {manualBookingForm}

      {/* Week list with actions */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">{listHeading}</h2>
          {selectedDay && (
            <Link
              href={`/appointments/dashboard/appointments?w=${weekOffset}`}
              className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
            >
              ← Show full week
            </Link>
          )}
        </div>
        {staffList.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={apptListHref(null)} className={staffPillClass(!selectedStaffId)}>
              All staff
            </Link>
            {staffList.map((s) => (
              <Link key={s.id} href={apptListHref(s.id)} className={staffPillClass(selectedStaffId === s.id)}>
                {s.name}
              </Link>
            ))}
          </div>
        )}
        {visibleAppointments.length === 0 && (
          <p className="text-slate-500 text-sm">No appointments {selectedDay ? 'that day' : 'this week'}.</p>
        )}
        {visibleAppointments.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-slate-800 bg-slate-900 p-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-base font-semibold text-white">
                  {formatSlotLabel(a.starts_at, business.timezone)}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status] ?? ''}`}
                >
                  {a.status}
                </span>
                {a.reference_code && (
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                    <Hash className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="font-mono tracking-widest text-slate-400">{a.reference_code}</span>
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5 font-medium text-slate-200">
                  <User className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                  {a.clients?.full_name || 'Unknown'}
                </span>
                {a.clients?.phone && (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                    {a.clients.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-emerald-300/90">
                  <Tag className="h-3.5 w-3.5 shrink-0 text-emerald-400/60" aria-hidden />
                  {a.services?.name}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  with {a.staff?.name}
                  <span className="text-slate-700">·</span>
                  {a.source === 'messenger' ? (
                    <span className="inline-flex items-center gap-1">
                      Messenger <MessageCircle className="h-3 w-3" aria-hidden />
                    </span>
                  ) : (
                    a.source
                  )}
                </span>
              </div>
              {a.intake_note && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-300/80">
                  <NotebookText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {a.intake_note}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {a.status !== 'cancelled' && (
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
                  <RescheduleForm appointmentId={a.id} />
                  {STATUS_ACTIONS.map(({ status, label, Icon }) => (
                    <form key={status} action={updateAppointmentStatus}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status" value={status} />
                      <button type="submit" title={label} aria-label={label} className={ICON_BUTTON_CLASS}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </button>
                    </form>
                  ))}
                </>
              )}
              {(a.status === 'cancelled' || a.status === 'no_show') && <RescheduleForm appointmentId={a.id} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
