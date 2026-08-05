import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MessageCircle, NotebookText } from 'lucide-react'
import { requireStaffAccess } from '@/lib/appointment-system/auth'
import { getTerms } from '@/lib/appointment-system/terminology'
import { formatSlotLabel } from '@/lib/appointment-system/slots'
import RecordPaymentForm from '@/components/appointment-system/RecordPaymentForm'
import ClientNotesForm from '@/components/appointment-system/ClientNotesForm'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-emerald-500/15 text-emerald-300',
  pending: 'bg-amber-500/15 text-amber-300',
  completed: 'bg-slate-500/15 text-slate-300',
  cancelled: 'bg-red-500/10 text-red-400/70',
  no_show: 'bg-red-500/15 text-red-300',
}

export default async function StaffClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const { supabase, business } = await requireStaffAccess()
  const t = getTerms(business.business_types)

  const [clientRes, apptRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).eq('business_id', business.id).maybeSingle(),
    supabase
      .from('appointments')
      .select('*, services(name, price), staff(name)')
      .eq('client_id', clientId)
      .eq('business_id', business.id)
      .order('starts_at', { ascending: false }),
  ])
  const client = clientRes.data
  if (!client) notFound()
  const appointments = apptRes.data ?? []

  const completed = appointments.filter((a) => a.status === 'completed')
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: business.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <Link href="/appointments/staff/dashboard/clients" className="text-sm text-slate-400 hover:text-white">
          ← All {t.clients}
        </Link>
        <h1 className="text-2xl font-bold mt-2">
          {client.full_name || 'Unnamed ' + t.client}
          {client.messenger_psid && (
            <span className="ml-3 inline-flex items-center gap-1 text-sm font-normal text-slate-400">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              Messenger {t.client}
            </span>
          )}
        </h1>
        <p className="text-slate-400 text-sm mt-1">{client.phone || 'no phone on file'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400 uppercase">Visits</p>
          <p className="text-xl font-bold text-emerald-300 mt-1">{completed.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-400 uppercase">No-shows</p>
          <p className="text-xl font-bold text-emerald-300 mt-1">
            {appointments.filter((a) => a.status === 'no_show').length}
          </p>
        </div>
      </div>

      <ClientNotesForm clientId={client.id} notes={client.notes} />

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">History</h2>
        {appointments.length === 0 && <p className="text-slate-500 text-sm">No appointments yet.</p>}
        {appointments.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className="font-medium">
                {formatSlotLabel(a.starts_at, business.timezone)}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[a.status] ?? ''}`}>
                  {a.status}
                </span>
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {a.services?.name} · ₱{Number(a.services?.price ?? 0).toFixed(0)} · with {a.staff?.name}
              </p>
              {a.intake_note && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-300/80">
                  <NotebookText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {a.intake_note}
                </p>
              )}
            </div>
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
          </div>
        ))}
      </div>
    </div>
  )
}
