import Link from 'next/link'
import QRCode from 'qrcode'
import { CircleCheck } from 'lucide-react'
import { requireBusiness } from '@/lib/appointment-system/auth'
import { getTerms } from '@/lib/appointment-system/terminology'
import ChangePasswordForm from '@/components/appointment-system/ChangePasswordForm'
import MessengerPreview from '@/components/appointment-system/MessengerPreview'
import { PLANS, PLAN_ORDER, hasFeature, tierWithFeature } from '@/lib/appointment-system/entitlements'
import { hasConfiguredHours } from '@/lib/appointment-system/slots'
import { DAY_KEYS, DAY_LABELS, type BusinessHours } from '@/lib/appointment-system/types'
import { updateBusinessProfile, saveFbConnection, updateClosedNotice, updateBusinessHours } from '../../actions'

export const dynamic = 'force-dynamic'

const TIER_PRICES: Record<string, string> = Object.fromEntries(
  PLAN_ORDER.map((tier) => [
    tier,
    PLANS[tier].priceMonthly === 0 ? 'Free' : `₱${PLANS[tier].priceMonthly.toLocaleString('en-PH')}/mo`,
  ])
)

export default async function SettingsPage() {
  const { business } = await requireBusiness()
  const t = getTerms(business.business_types)
  const connected = Boolean(business.fb_page_id)
  const hasMessengerBot = hasFeature(business, 'messenger_booking_bot')
  const settings = business.settings as { closed?: boolean; closed_message?: string; hours?: BusinessHours }
  const hours = settings.hours ?? DAY_KEYS.map(() => null)
  const hoursConfigured = hasConfiguredHours(business)
  const trialDaysLeft = Math.max(
    0,
    Math.ceil((new Date(business.trial_ends_at).getTime() - Date.now()) / 86400_000)
  )
  const webhookUrl = 'https://www.cyberussell.com/appointments/api/messenger/webhook'
  const bookingUrl = `https://www.cyberussell.com/appointments/${business.slug}`
  const bookingQrDataUrl = await QRCode.toDataURL(bookingUrl, { width: 180, margin: 1 })

  return (
    <div className="max-w-5xl lg:columns-2 lg:gap-x-8">
      {/* Profile */}
      <section className="mb-10 space-y-4 break-inside-avoid">
        <h1 className="text-2xl font-bold">Business profile</h1>
        <form action={updateBusinessProfile} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <Field label="Business name" name="name" defaultValue={business.name} required />
          <Field label="Phone" name="phone" defaultValue={business.phone} />
          <Field label="Address" name="address" defaultValue={business.address} />
          <p className="text-xs text-slate-500">
            Public booking page:{' '}
            <Link href={`/appointments/${business.slug}`} className="text-emerald-400 underline">
              cyberussell.com/appointments/{business.slug}
            </Link>
          </p>
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
            Save profile
          </button>
        </form>
        <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bookingQrDataUrl} alt="QR code to your public booking page" className="h-24 w-24 shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-200">Your booking page QR code</p>
            <p className="mt-1 text-xs text-slate-500">
              Print or display this so {t.clients} can scan straight to your booking page — no typing needed.
            </p>
            <a
              href={bookingQrDataUrl}
              download={`${business.slug}-booking-qr.png`}
              className="mt-2 inline-block text-xs font-medium text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
            >
              Download QR code
            </a>
          </div>
        </div>
      </section>

      {/* Closed notice */}
      <section className="mb-10 space-y-4 break-inside-avoid">
        <div>
          <h2 className="text-xl font-bold">
            Business status{' '}
            <span
              className={`ml-2 rounded-full px-3 py-1 text-xs align-middle ${
                settings.closed ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
              }`}
            >
              {settings.closed ? 'Closed' : 'Open for bookings'}
            </span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Mark the {t.business} closed (holiday, emergency, renovation) — the Messenger bot and web
            booking pause and show your message instead.
          </p>
        </div>
        <form action={updateClosedNotice} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              name="closed"
              defaultChecked={Boolean(settings.closed)}
              className="h-4 w-4 accent-emerald-500"
            />
            Temporarily closed
          </label>
          <label className="block">
            <span className="text-sm text-slate-300">Message shown to {t.clients}</span>
            <input
              name="closed_message"
              defaultValue={settings.closed_message ?? ''}
              placeholder="e.g. Closed po kami hanggang July 10 for renovation. See you soon!"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
            Save status
          </button>
        </form>
      </section>

      {/* Business hours */}
      <section className="mb-10 space-y-4 break-inside-avoid">
        <div>
          <h2 className="text-xl font-bold">
            Business hours{' '}
            <span
              className={`ml-2 rounded-full px-3 py-1 text-xs align-middle ${
                hoursConfigured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
              }`}
            >
              {hoursConfigured ? 'Set' : 'Not set — booking page paused'}
            </span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Set which days you&apos;re open and your general hours. Until at least one day is set,
            your public booking page won&apos;t accept online bookings. This doesn&apos;t change staff
            Availability — it&apos;s a general "we&apos;re open" signal shown to {t.clients}.
          </p>
        </div>
        <form action={updateBusinessHours} className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-5">
          {DAY_KEYS.map((key, i) => {
            const day = hours[i]
            return (
              <div key={key} className="flex flex-wrap items-center gap-3">
                <label className="flex w-32 items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    name={`${key}_open`}
                    defaultChecked={Boolean(day)}
                    className="h-4 w-4 accent-emerald-500"
                  />
                  {DAY_LABELS[i]}
                </label>
                <input
                  type="time"
                  name={`${key}_start`}
                  defaultValue={day?.open ?? '09:00'}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
                />
                <span className="text-slate-500 text-sm">to</span>
                <input
                  type="time"
                  name={`${key}_end`}
                  defaultValue={day?.close ?? '17:00'}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>
            )
          })}
          <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
            Save hours
          </button>
        </form>
      </section>

      {/* Billing */}
      <section className="mb-10 space-y-4 break-inside-avoid">
        <h2 className="text-xl font-bold">Billing</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">
                {PLANS[business.plan_tier]?.name ?? business.plan_tier} plan{' '}
                <span className="text-slate-400 font-normal">· {TIER_PRICES[business.plan_tier]}</span>
              </p>
              <p className="text-sm text-slate-400 mt-0.5">
                {business.plan_status === 'trial' &&
                  `Free trial — ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} remaining (ends ${new Date(business.trial_ends_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })}).`}
                {business.plan_status === 'active' && (
                  <span className="inline-flex items-center gap-1.5">
                    Subscription active. Salamat po!
                    <CircleCheck className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
                  </span>
                )}
                {business.plan_status === 'suspended' &&
                  'Subscription inactive — bookings are paused until payment is settled.'}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                business.plan_status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : business.plan_status === 'trial'
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-red-500/15 text-red-300'
              }`}
            >
              {business.plan_status}
            </span>
          </div>
          <div className="rounded-lg bg-slate-800/60 p-4 text-sm text-slate-300 space-y-2">
            <p className="font-medium text-slate-200">How to pay</p>
            <p>
              Pay online with card or GCash from the{' '}
              <Link href="/appointments/dashboard/billing" className="text-emerald-400 underline">
                Billing tab
              </Link>{' '}
              — your plan updates automatically. Prefer to arrange it manually instead? Message us
              through the{' '}
              <Link href="/contact" className="text-emerald-400 underline">
                contact page
              </Link>{' '}
              with your business name and we&apos;ll send payment details; manual payments are
              confirmed within 24 hours.
            </p>
            <p className="text-slate-400">
              Plans: {PLAN_ORDER.map((p) => `${PLANS[p].name} ${PLANS[p].priceMonthly === 0 ? '₱0' : `₱${PLANS[p].priceMonthly.toLocaleString('en-PH')}`}`).join(' · ')} per month —{' '}
              <Link href="/appointments#pricing" className="text-emerald-400 underline">
                compare plans
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Facebook connection */}
      <section className="mb-10 space-y-4 break-inside-avoid">
        <div>
          <h2 className="text-xl font-bold">
            Facebook Page connection{' '}
            {connected ? (
              <span className="ml-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300 align-middle">
                Connected · Page {business.fb_page_id}
              </span>
            ) : (
              <span className="ml-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300 align-middle">
                Not connected
              </span>
            )}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Connect your Page so {t.clients} can book by simply messaging you on Facebook.{' '}
            <Link href="/appointments/dashboard/help" className="text-emerald-400 underline">
              Step-by-step guide in Help
            </Link>
            .
          </p>
        </div>
        {hasMessengerBot ? (
          <form action={saveFbConnection} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
            <Field label="Facebook Page ID" name="fb_page_id" defaultValue={business.fb_page_id ?? ''} required />
            <Field label="Page Access Token" name="fb_page_token" type="password" required />
            <p className="text-xs text-slate-500 break-all">Webhook URL for the Meta app: {webhookUrl}</p>
            <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
              Save connection
            </button>
          </form>
        ) : (
          <MessengerPreview
            tierName={tierWithFeature('messenger_booking_bot').name}
            priceMonthly={tierWithFeature('messenger_booking_bot').priceMonthly}
          />
        )}
      </section>

      {/* Password */}
      <section className="mb-10 space-y-4 break-inside-avoid">
        <h2 className="text-xl font-bold">Change password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  )
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
  disabled,
}: {
  label: string
  name: string
  defaultValue?: string
  type?: string
  required?: boolean
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-300">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  )
}
