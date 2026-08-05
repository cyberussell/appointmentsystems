import type { SupabaseClient } from '@supabase/supabase-js'
import type { Business, PlanTier } from './types'

// ── Single source of truth for plans and entitlements ───────────────────────
// All plan gating goes through this module. Never write `plan_tier === 'pro'`
// checks elsewhere — add a feature flag or limit here instead. The config is
// code-driven for v1 (four plans, manual billing); if plans ever become
// user-configurable, swap the PLANS constant for a DB read without touching
// call sites.

// Only flags that are actually built and enforced belong here. Add a flag at
// the point a gated feature ships (see the "Soon" items in PLAN_BULLETS
// below for what's planned but not real yet) — don't pre-declare flags for
// features that don't exist, that's how customer_records/no_show_tracking
// etc. ended up declared but never checked anywhere in a previous pass.
export type FeatureFlag = 'messenger_booking_bot' | 'email_notifications' | 'basic_reporting'

export const FEATURE_LABELS: Record<FeatureFlag, string> = {
  messenger_booking_bot: 'Messenger booking bot',
  email_notifications: 'Email notifications',
  basic_reporting: 'Reporting',
}

export interface PlanConfig {
  tier: PlanTier
  name: string
  priceMonthly: number // PHP
  tagline: string
  /** null = unlimited */
  monthlyAppointments: number | null
  /** null = unlimited */
  providerLimit: number | null
  features: FeatureFlag[]
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    tier: 'free',
    name: 'Free',
    priceMonthly: 0,
    tagline: 'Start accepting bookings.',
    monthlyAppointments: 100,
    providerLimit: 1,
    features: [],
  },
  basic: {
    tier: 'basic',
    name: 'Basic',
    priceMonthly: 299,
    tagline: 'Simple online booking.',
    monthlyAppointments: null,
    providerLimit: 5,
    features: ['email_notifications', 'basic_reporting'],
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    priceMonthly: 699,
    tagline: 'Booking automation for growing businesses.',
    monthlyAppointments: null,
    providerLimit: null,
    features: ['email_notifications', 'basic_reporting', 'messenger_booking_bot'],
  },
}

export const PLAN_ORDER: PlanTier[] = ['free', 'basic', 'pro']

// Marketing/UI bullet copy per plan — shown on both the public landing page
// and the logged-in Billing tab. Single-sourced here so the two can never
// show different feature lists for the same plan.
//
// "(soon)" marks anything not actually shippable yet — remove the tag the
// moment the feature ships, not before.
export const PLAN_BULLETS: Record<PlanTier, string[]> = {
  free: [
    '1 staff login',
    'Public booking page',
    'Appointment calendar',
    'Customer records & notes',
    'No-show tracking',
    'Services and pricing',
    'Business hours',
    'Breaks & blocked dates',
    'Cancellation and rescheduling',
    'Manual and walk-in appointments',
    'Up to 100 appointments / month',
  ],
  basic: [
    'Everything in Free',
    'Up to 5 staff logins',
    'Unlimited appointments',
    'Email notifications',
    'Calendar sync (soon)',
    'Basic reporting',
    'Waitlist (soon)',
  ],
  pro: [
    'Everything in Basic',
    'Unlimited staff logins',
    'Messenger booking bot',
    'SMS + email reminders (soon)',
    'Deposits (soon)',
    'White label (soon)',
    'Advanced reporting & data export (soon)',
    'Recurring appointments (soon)',
    'Memberships & packages (soon)',
  ],
}

// Bullet-point feature summary shown on the PayMongo checkout page. Built
// only from what's actually shipped (PLANS' limits/features), never from
// PLAN_BULLETS directly — a paying customer shouldn't see "(soon)" promises
// on the payment screen itself.
export const PLAN_CHECKOUT_SUMMARY: Record<PlanTier, string> = {
  free: '',
  basic: '• Unlimited appointments  • Up to 5 staff logins  • Email notifications  • Basic reporting',
  pro: '• Unlimited appointments  • Unlimited staff logins  • Email notifications  • Basic reporting  • Messenger booking bot',
}

function planOf(business: Pick<Business, 'plan_tier'>): PlanConfig {
  return PLANS[business.plan_tier] ?? PLANS.free
}

export function hasFeature(business: Pick<Business, 'plan_tier'>, feature: FeatureFlag): boolean {
  return planOf(business).features.includes(feature)
}

export function getFeatureLimit(
  business: Pick<Business, 'plan_tier'>,
  limit: 'monthlyAppointments' | 'providerLimit'
): number | null {
  return planOf(business)[limit]
}

/** First tier (in upgrade order) that includes the feature — for upgrade prompts. */
export function tierWithFeature(feature: FeatureFlag): PlanConfig {
  const tier = PLAN_ORDER.find((p) => PLANS[p].features.includes(feature)) ?? 'pro'
  return PLANS[tier]
}

// ── Usage (computed from existing tables; no counter tables needed) ─────────

function monthStartUtc(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/** Appointments created this calendar month (all sources, excluding cancelled). */
export async function getMonthlyAppointmentUsage(
  db: SupabaseClient,
  businessId: string
): Promise<number> {
  const { count } = await db
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .neq('status', 'cancelled')
    .gte('created_at', monthStartUtc())
  return count ?? 0
}

// `used` is always the real count, even when limit is null — callers that
// only care about "can I add one more" can ignore it, but anything showing
// usage (the dashboard meter, the setup checklist) needs the true number,
// not a placeholder 0 that only happened to be harmless at the call sites
// this originally shipped with.
export async function canCreateAppointment(
  db: SupabaseClient,
  business: Business
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const limit = planOf(business).monthlyAppointments
  const used = await getMonthlyAppointmentUsage(db, business.id)
  return { allowed: limit === null || used < limit, used, limit }
}

export async function canAddProvider(
  db: SupabaseClient,
  business: Business
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const limit = planOf(business).providerLimit
  const { count } = await db
    .from('staff')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', business.id)
    .eq('active', true)
  const used = count ?? 0
  return { allowed: limit === null || used < limit, used, limit }
}
