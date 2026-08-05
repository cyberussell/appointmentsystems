import Link from 'next/link'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import ManageBookingView from '@/components/appointment-system/ManageBookingView'

export const dynamic = 'force-dynamic'

interface ApptRow {
  id: string
  starts_at: string
  status: string
  service_id: string
  businesses: { name: string; slug: string; timezone: string } | null
  services: { name: string } | null
  staff: { name: string } | null
  clients: { full_name: string; phone: string } | null
}

export default async function ManageBookingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const db = createAdminSupabase()
  const { data } = await db
    .from('appointments')
    .select(
      'id, starts_at, status, service_id, businesses(name, slug, timezone), services(name), staff(name), clients(full_name, phone)'
    )
    .eq('reference_code', code.toUpperCase())
    .maybeSingle()

  const appt = data as unknown as ApptRow | null

  if (!appt || !appt.businesses) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
          <p className="font-semibold text-white">Booking not found</p>
          <p className="mt-1.5 text-sm text-slate-400">
            That reference code doesn&apos;t match any booking. Double-check the code and try again.
          </p>
          <Link
            href="/appointments/manage"
            className="mt-4 inline-block text-sm font-medium text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
          >
            Try a different code
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(16,185,129,0.14), transparent 70%)',
        }}
        aria-hidden
      />
      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-20">
        <header className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">Manage booking</p>
          <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">{appt.businesses.name}</h1>
        </header>

        <ManageBookingView
          code={code.toUpperCase()}
          businessSlug={appt.businesses.slug}
          businessName={appt.businesses.name}
          timezone={appt.businesses.timezone}
          serviceId={appt.service_id}
          serviceName={appt.services?.name ?? 'Appointment'}
          staffName={appt.staff?.name ?? 'staff'}
          clientName={appt.clients?.full_name ?? ''}
          clientPhone={appt.clients?.phone ?? ''}
          startsAtIso={appt.starts_at}
          status={appt.status}
        />

        <footer className="mt-16 text-center text-xs text-slate-600">
          Powered by <span className="text-slate-500">Cyberussell Appointment System</span>
        </footer>
      </div>
    </main>
  )
}
