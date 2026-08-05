import Link from 'next/link'
import { DoorClosed } from 'lucide-react'
import { requireStaffAccess } from '@/lib/appointment-system/auth'
import { getTerms } from '@/lib/appointment-system/terminology'
import { PLANS } from '@/lib/appointment-system/entitlements'
import NavTabs from '@/components/appointment-system/NavTabs'
import { signOut } from '../../actions'

export default async function StaffDashboardLayout({ children }: { children: React.ReactNode }) {
  const { business, staff } = await requireStaffAccess()
  const t = getTerms(business.business_types)
  const settings = business.settings as { closed?: boolean; closed_message?: string }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/appointments/staff/dashboard" className="text-lg font-bold">
              Appointment <span className="text-emerald-400">System</span>
            </Link>
            <span className="text-slate-400 text-sm hidden sm:inline">· {business.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-500/15 px-3 py-1 text-xs font-medium text-slate-300">
              {staff.name} · Staff
            </span>
            <form action={signOut}>
              <button className="text-sm text-slate-400 hover:text-white transition">Log out</button>
            </form>
          </div>
        </div>
        <NavTabs clientsLabel={t.Clients} entitledFeatures={PLANS[business.plan_tier].features} role="staff" />
      </header>
      {settings.closed && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-sm py-2 px-4">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 text-center">
            <DoorClosed className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              {business.name} is marked as <strong>CLOSED</strong> — {t.clients} cannot book via Messenger or the
              web right now.
            </span>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
