import Link from 'next/link'
import { DoorClosed } from 'lucide-react'
import { requireBusiness } from '@/lib/appointment-system/auth'
import { getTerms } from '@/lib/appointment-system/terminology'
import NavTabs from '@/components/appointment-system/NavTabs'
import { PLANS } from '@/lib/appointment-system/entitlements'
import { signOut } from '../actions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { business } = await requireBusiness()
  const t = getTerms(business.business_types)
  const trialDaysLeft = Math.max(
    0,
    Math.ceil((new Date(business.trial_ends_at).getTime() - Date.now()) / 86400_000)
  )
  const settings = business.settings as { closed?: boolean; closed_message?: string }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/appointments/dashboard" className="text-lg font-bold">
              Appointment <span className="text-emerald-400">System</span>
            </Link>
            <span className="text-slate-400 text-sm hidden sm:inline">· {business.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {business.plan_status === 'active' && business.plan_renews_at && (
              <span className="hidden text-xs text-slate-500 sm:inline">
                Renews{' '}
                {new Date(business.plan_renews_at).toLocaleDateString('en-PH', {
                  timeZone: business.timezone,
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                business.plan_status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : business.plan_status === 'trial'
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-red-500/15 text-red-300'
              }`}
            >
              {business.plan_status === 'trial'
                ? `Trial · ${trialDaysLeft}d left`
                : business.plan_status === 'active'
                  ? `${PLANS[business.plan_tier]?.name ?? business.plan_tier} plan`
                  : 'Suspended'}
            </span>
            {business.plan_tier !== 'pro' && (
              <Link
                href="/appointments/dashboard/billing"
                className="hidden text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline sm:inline"
              >
                Upgrade
              </Link>
            )}
            <form action={signOut}>
              <button className="text-sm text-slate-400 hover:text-white transition">Log out</button>
            </form>
          </div>
        </div>
        <NavTabs clientsLabel={t.Clients} entitledFeatures={PLANS[business.plan_tier].features} />
      </header>
      {settings.closed && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-sm py-2 px-4">
          <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 text-center">
            <DoorClosed className="h-4 w-4 shrink-0" aria-hidden />
            <span>
              Your {t.business} is marked as <strong>CLOSED</strong> — {t.clients} cannot book via Messenger or
              the web right now. Reopen it in{' '}
          <Link href="/appointments/dashboard/settings" className="underline">
            Settings
          </Link>
              .
            </span>
          </div>
        </div>
      )}
      {business.plan_status === 'suspended' && (
        <div className="bg-red-500/10 border-b border-red-500/30 text-red-300 text-sm text-center py-2 px-4">
          Your subscription is inactive — the Messenger bot and public booking page are paused. See{' '}
          <Link href="/appointments/dashboard/settings" className="underline">
            Settings → Billing
          </Link>{' '}
          to reactivate.
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
