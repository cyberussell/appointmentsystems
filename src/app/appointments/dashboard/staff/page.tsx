import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import { requireBusiness } from '@/lib/appointment-system/auth'
import { getTerms } from '@/lib/appointment-system/terminology'
import { canAddProvider, PLANS } from '@/lib/appointment-system/entitlements'
import StaffForm from '@/components/appointment-system/StaffForm'
import StaffInviteForm from '@/components/appointment-system/StaffInviteForm'
import StaffResendInviteForm from '@/components/appointment-system/StaffResendInviteForm'
import { toggleStaff, deleteStaff } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const { supabase, business } = await requireBusiness()
  const t = getTerms(business.business_types)
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at')

  const seats = await canAddProvider(supabase, business)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Staff</h1>
        <p className="text-slate-400 text-sm mt-1">
          Who your {t.clients} can be booked with.
          {seats.limit !== null && (
            <span className="text-slate-500">
              {' '}
              · {seats.used} of {seats.limit} staff login{seats.limit === 1 ? '' : 's'} used on the{' '}
              {PLANS[business.plan_tier].name} plan.
            </span>
          )}
        </p>
      </div>

      {seats.limit !== null && seats.used > seats.limit && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <span>
            You have {seats.used} active staff logins, but the {PLANS[business.plan_tier].name} plan only allows{' '}
            {seats.limit}. Deactivate {seats.used - seats.limit} to get back within your limit, or{' '}
            <Link href="/appointments/dashboard/billing" className="font-semibold underline underline-offset-4">
              upgrade your plan
            </Link>
            .
          </span>
        </div>
      )}

      <StaffForm />

      <ul className="space-y-2">
        {(staff ?? []).map((m) => (
          <li
            key={m.id}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className={`font-medium ${m.active ? '' : 'text-slate-500 line-through'}`}>
                {m.name}
                {m.profile_id ? (
                  <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-normal text-emerald-300 align-middle">
                    Has login
                  </span>
                ) : m.invite_email ? (
                  <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-normal text-amber-300 align-middle">
                    Invited
                  </span>
                ) : null}
              </p>
              {m.title && <p className="text-sm text-slate-400">{m.title}</p>}
              {!m.profile_id && !m.invite_email && (
                <div className="mt-2">
                  <StaffInviteForm staffId={m.id} />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {m.profile_id && <StaffResendInviteForm staffId={m.id} />}
              <form action={toggleStaff}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="active" value={String(m.active)} />
                <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-400 transition">
                  {m.active ? 'Deactivate' : 'Activate'}
                </button>
              </form>
              <form action={deleteStaff}>
                <input type="hidden" name="id" value={m.id} />
                <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-red-400 hover:border-red-400 transition">
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
        {(staff ?? []).length === 0 && (
          <li className="text-slate-500 text-sm">No staff yet — add your first practitioner above.</li>
        )}
      </ul>
    </div>
  )
}
