import 'server-only'
import { redirect } from 'next/navigation'
import { createServerSupabase, createAdminSupabase } from './supabase-server'
import type { Business, Staff } from './types'

// Lazy overdue check: a paid plan whose billing cycle has lapsed with no new
// payment gets suspended on next dashboard load (no cron needed for v1).
// Uses the admin client — plan_status is not owner-writable (see migration
// 011_protect_billing_columns.sql).
async function applyLazySuspend(business: Business): Promise<Business> {
  if (
    business.plan_status === 'active' &&
    business.plan_renews_at &&
    new Date(business.plan_renews_at).getTime() < Date.now()
  ) {
    const { data: updated } = await createAdminSupabase()
      .from('businesses')
      .update({ plan_status: 'suspended' })
      .eq('id', business.id)
      .select('*')
      .maybeSingle()
    if (updated) return updated as Business
  }
  return business
}

// Every owner-only dashboard page/action calls this: resolves the signed-in
// owner + their business, or redirects to the right onboarding step.
export async function requireBusiness() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/appointments/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!business) {
    // A staff login landing on an owner-only page isn't an unprovisioned
    // account — send them to a clean "not for you" screen instead of
    // signup, which would wrongly suggest they need to create a business.
    const { data: staff } = await supabase
      .from('staff')
      .select('id')
      .eq('profile_id', user.id)
      .eq('active', true)
      .maybeSingle()
    redirect(staff ? '/appointments/not-authorized' : '/appointments/signup?step=business')
  }

  return { supabase, user, business: await applyLazySuspend(business as Business) }
}

export async function getSessionUser() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

// Every staff dashboard page calls this: resolves the signed-in staff member
// + the business they belong to, or redirects. Deliberately separate from
// requireBusiness() — a staff login is never treated as owner access.
export async function requireStaffAccess() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/appointments/login')

  const { data: staff } = await supabase
    .from('staff')
    .select('*, businesses(*)')
    .eq('profile_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!staff || !staff.businesses) redirect('/appointments/login')

  const { businesses: business, ...staffRow } = staff as Staff & { businesses: Business }
  return { supabase, user, business, staff: staffRow as Staff }
}

// For Server Actions shared between the owner and staff dashboards
// (appointments, clients, conversations) — resolves whichever role the
// signed-in user actually has. Owner-only actions (billing, staff
// management, settings) should keep calling requireBusiness() directly, not
// this — this exists so operational actions don't have to care which role
// is calling them, RLS already scopes what each role can actually write.
export async function requireBusinessAccess() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/appointments/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (business) {
    return { supabase, user, business: await applyLazySuspend(business as Business), role: 'owner' as const }
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('*, businesses(*)')
    .eq('profile_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (staff?.businesses) {
    return { supabase, user, business: staff.businesses as Business, role: 'staff' as const }
  }

  redirect('/appointments/login')
}
