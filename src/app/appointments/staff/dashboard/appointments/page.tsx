import { MessageCircle, NotebookText } from 'lucide-react'
import { requireStaffAccess } from '@/lib/appointment-system/auth'
import { getTerms } from '@/lib/appointment-system/terminology'
import { formatSlotLabel } from '@/lib/appointment-system/slots'
import type { Service, Staff } from '@/lib/appointment-system/types'
import ManualAppointmentForm from '@/components/appointment-system/ManualAppointmentForm'
import RecordPaymentForm from '@/components/appointment-system/RecordPaymentForm'
import RescheduleForm from '@/components/appointment-system/RescheduleForm'
import { updateAppointmentStatus } from '../../../actions'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  completed: 'bg-slate-500/15 text-slate-400 border-slate-600/30',
  cancelled: 'bg-red-500/10 text-red-400/70 border-red-500/20',
  no_show: 'bg-red-500/15 text-red-300 border-red-500/30',
}

interface ApptRow {
  id: string
  starts_at: string
  status: string
  source: string
  intake_note: string
  amount_paid: number
  paid_at: string | null
  reference_code: string | null
  clients: { full_name: string; phone: string } | null
  services: { name: string; price: number } | null
  staff: { name: string } | null
}

export default async function StaffAppointmentsPage() {
  const { supabase, business } = await requireStaffAccess()
  const t = getTerms(business.business_types)

  const now = new Date()
  const windowEnd = new Date(now.getTime() + 14 * 86400_000)

  const [svcRes, staffRes, apptRes] = await Promise.all([
    supabase.from('services').select('*').eq('business_id', business.id).eq('active', true).order('created_at'),
    supabase.from('staff').select('*').eq('business_id', business.id).eq('active', true).order('created_at'),
    supabase
      .from('appointments')
      .select(
        'id, starts_at, status, source, intake_note, amount_paid, paid_at, reference_code, clients(full_name, phone), services(name, price), staff(name)'
      )
      .eq('business_id', business.id)
      .gte('starts_at', now.toISOString())
      .lt('starts_at', windowEnd.toISOString())
      .order('starts_at'),
  ])

  const appointments = (apptRes.data ?? []) as unknown as ApptRow[]
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: business.timezone }).format(now)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Appointments</h1>

      <ManualAppointmentForm
        clientLabel={t.Client}
        providerNoun={t.provider}
        services={(svcRes.data ?? []) as Service[]}
        staff={(staffRes.data ?? []) as Staff[]}
      />

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Next 14 days</h2>
        {appointments.length === 0 && <p className="text-slate-500 text-sm">No upcoming appointments.</p>}
        {appointments.map((a) => (
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
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium text-slate-200">{a.clients?.full_name || 'Unknown'}</span>
                {a.clients?.phone && <span className="text-slate-400">{a.clients.phone}</span>}
                <span className="text-emerald-300/90">{a.services?.name}</span>
                <span className="text-xs text-slate-500">
                  with {a.staff?.name}
                  {a.source === 'messenger' && (
                    <span className="inline-flex items-center gap-1">
                      {' '}
                      · Messenger <MessageCircle className="h-3 w-3" aria-hidden />
                    </span>
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
                  <form action={updateAppointmentStatus}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="status" value="completed" />
                    <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-400 transition">
                      Done
                    </button>
                  </form>
                  <form action={updateAppointmentStatus}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="status" value="no_show" />
                    <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-400 transition">
                      No-show
                    </button>
                  </form>
                  <form action={updateAppointmentStatus}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="status" value="cancelled" />
                    <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-400 transition">
                      Cancel
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
