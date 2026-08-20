import type { Metadata } from 'next'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Check as CheckIcon, CircleX, Flower2, HandHeart, HeartPulse, Hospital, Scissors, Smile, Sparkles, Stethoscope } from 'lucide-react'
import './landing.css'
import { PLANS, PLAN_ORDER, PLAN_BULLETS, WEBSITE_ADDON_PRICE_YEARLY } from '@/lib/appointment-system/entitlements'
import LandingNav from '@/components/appointment-system/landing/LandingNav'
import TrackedLink from '@/components/appointment-system/landing/TrackedLink'
import RoiCalculator from '@/components/appointment-system/landing/RoiCalculator'
import PlanComparisonTable from '@/components/appointment-system/PlanComparisonTable'

export const metadata: Metadata = {
  title: 'Affordable Online Appointment Booking System for Small Businesses | Cyberussell',
  description:
    'Simple online appointment booking software for solo clinics, salons, spas, barbershops, and small businesses. Start free and upgrade only when you need more staff or automation.',
  alternates: { canonical: 'https://www.cyberussell.com/appointments' },
  openGraph: {
    title: 'Appointment System — stop managing appointments through endless chats',
    description:
      'Give customers a booking page, manage appointments in one place, and automate repetitive conversations. Free plan available.',
    url: 'https://www.cyberussell.com/appointments',
    siteName: 'Cyberussell',
    type: 'website',
    images: [{ url: '/og-image.jpg?v=2', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Appointment System by Cyberussell',
    description:
      'Simple, affordable appointment booking for Filipino small businesses. Start free.',
    images: ['/og-image.jpg?v=2'],
  },
}

// ── Content data ─────────────────────────────────────────────────────────────

const PLAN_CTA: Record<string, string> = {
  free: 'Start Free',
  basic: 'Choose Basic',
  pro: 'Choose Pro',
}


const FAQS: { q: string; a: string }[] = [
  { q: 'Do I need a website?', a: 'No. The system gives you a public booking page you can share anywhere — Facebook, Messenger, Instagram, TikTok, or Google Business Profile.' },
  { q: 'Can customers book using their phone?', a: 'Yes. The booking page is fully mobile responsive — most customers book straight from their phone.' },
  { q: 'Can I add appointments manually?', a: 'Yes. You can add phone bookings, Messenger bookings, and walk-ins from the dashboard on any plan.' },
  { q: 'Can customers cancel or reschedule?', a: 'Yes, according to your booking rules. You can also reschedule or cancel any appointment from the dashboard.' },
  { q: 'Can I use this for a solo clinic?', a: 'Yes. The system is specifically designed for solo providers and small appointment-based businesses.' },
  { q: 'Can I upgrade later?', a: 'Yes. Start free and upgrade only when you need more bookings, staff accounts, or automation.' },
  { q: 'Can I cancel anytime?', a: 'Yes. There are no long-term contracts — cancel anytime.' },
]

const AUDIENCES: { icon: LucideIcon; name: string; scenario: string }[] = [
  { icon: Stethoscope, name: 'Solo Doctors', scenario: 'Consultations booked while you see patients' },
  { icon: Hospital, name: 'Small Clinics', scenario: 'One calendar for the whole front desk' },
  { icon: Smile, name: 'Dental Practices', scenario: 'Cleanings and check-ups, no double-booking' },
  { icon: Scissors, name: 'Beauty Salons', scenario: 'Clients pick a stylist and time themselves' },
  { icon: Scissors, name: 'Barbershops', scenario: 'Walk-ins and bookings on the same schedule' },
  { icon: HandHeart, name: 'Nail Salons', scenario: 'Back-to-back slots without the chat ping-pong' },
  { icon: HandHeart, name: 'Massage Spas', scenario: 'Therapist availability, always accurate' },
  { icon: Flower2, name: 'Wellness Businesses', scenario: 'Sessions, classes, and 1-on-1 bookings' },
]

// ── Structured data ──────────────────────────────────────────────────────────

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Cyberussell Appointment System',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://www.cyberussell.com/appointments',
      description:
        'Online appointment booking system for small Filipino businesses: booking page, appointment calendar, customer records, and Messenger booking automation.',
      offers: PLAN_ORDER.map((tier) => ({
        '@type': 'Offer',
        name: `${PLANS[tier].name} plan`,
        price: PLANS[tier].priceMonthly,
        priceCurrency: 'PHP',
      })),
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
}

// ── Small shared pieces ──────────────────────────────────────────────────────

function SectionHeading({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      {eyebrow && (
        <p className="mb-3 text-xs font-bold uppercase tracking-[3px] text-amber-300">{eyebrow}</p>
      )}
      <h2 className="font-[family-name:var(--font-syne)] text-3xl font-bold text-white sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-slate-300">{sub}</p>}
    </div>
  )
}

function Check() {
  return <CheckIcon aria-label="Included" className="h-4 w-4 shrink-0 text-emerald-400" />
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AppointmentSystemLanding() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* soft happy-color glows behind everything */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-40 h-[400px] w-[500px] rounded-full bg-amber-400/[0.07] blur-[120px]" />
      </div>

      <div className="relative">
        <LandingNav />

        <main>
          {/* ── Hero ── */}
          <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pt-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[3px] text-amber-300">
                  Online appointments. Zero phone tag.
                </p>
                <h1 className="mt-4 font-[family-name:var(--font-syne)] text-4xl font-bold leading-tight sm:text-5xl">
                  Let clients book in seconds.{' '}
                  <span className="bg-gradient-to-r from-emerald-400 to-amber-300 bg-clip-text text-transparent">
                    Focus on the work that matters.
                  </span>
                </h1>
                <p className="mt-6 max-w-lg text-lg text-slate-300">
                  Give every client a seamless booking experience while your schedule organizes
                  itself. Reduce phone calls, prevent double bookings, and keep your team in
                  sync—all from one modern appointment platform.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <TrackedLink
                    href="/appointments/signup"
                    event="landing_cta_clicked"
                    params={{ location: 'hero' }}
                    className="rounded-xl bg-emerald-500 px-7 py-3.5 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
                  >
                    Start Free
                  </TrackedLink>
                  <a
                    href="#how-it-works"
                    className="as-glass rounded-xl px-7 py-3.5 font-semibold text-slate-100 transition hover:bg-white/10"
                  >
                    Watch Demo
                  </a>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Free forever plan • No credit card required • Setup in under 2 minutes
                </p>
              </div>

              {/* Hero product demo: booking flow → dashboard (CSS animated) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="as-glass-strong rounded-2xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your booking page</p>
                  <p className="mt-1 font-semibold text-white">Bright Salon</p>
                  <ol className="mt-4 space-y-2.5">
                    {['Select Service — Haircut', 'Choose Date — Tomorrow', 'Choose Time — 3:30 PM', 'Booking Confirmed'].map((step, i) => (
                      <li key={step} className="as-step flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-200">
                        <span>{step}</span>
                        <span className={`as-step-check flex h-5 w-5 items-center justify-center rounded-full ${i === 3 ? 'bg-amber-300 text-slate-950' : 'bg-emerald-500 text-slate-950'}`}>
                          <CheckIcon className="h-3 w-3" aria-hidden />
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="as-glass rounded-2xl p-5 sm:mt-10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your dashboard · Today</p>
                  <div className="mt-4 space-y-2.5 text-sm">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-slate-300">
                      10:00 AM · Rebond · Ana
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-slate-300">
                      1:00 PM · Hair color · Marco
                    </div>
                    <div className="as-appt-pop rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3.5 py-2.5 font-medium text-emerald-200">
                      <span>3:30 PM · Haircut · New booking</span>
                      <Sparkles className="ml-1 inline h-3.5 w-3.5 text-amber-300" aria-hidden />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Problem ── */}
          <section className="mx-auto max-w-6xl px-4 py-20">
            <SectionHeading title="Still managing appointments one message at a time?" />
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="as-glass rounded-2xl p-5">
                <div className="as-chat flex flex-col gap-2 text-sm">
                  <p className="ml-auto max-w-[75%] rounded-2xl rounded-br-sm bg-white/10 px-3.5 py-2 text-slate-100">Available po kayo tomorrow?</p>
                  <p className="mr-auto max-w-[75%] rounded-2xl rounded-bl-sm bg-emerald-500/90 px-3.5 py-2 text-slate-950">What time po?</p>
                  <p className="ml-auto max-w-[75%] rounded-2xl rounded-br-sm bg-white/10 px-3.5 py-2 text-slate-100">Afternoon.</p>
                  <p className="mr-auto max-w-[75%] rounded-2xl rounded-bl-sm bg-emerald-500/90 px-3.5 py-2 text-slate-950">2 PM?</p>
                  <p className="ml-auto max-w-[75%] rounded-2xl rounded-br-sm bg-white/10 px-3.5 py-2 text-slate-100">Pwede 3 PM?</p>
                  <p className="mr-auto pt-1 text-xs text-slate-500">…and 12 more messages before it&apos;s booked.</p>
                </div>
              </div>
              <div>
                <ul className="space-y-3">
                  {['Too many messages.', 'Missed bookings.', 'Double bookings.', 'Forgotten appointments.', 'Time spent answering the same questions.'].map((p) => (
                    <li key={p} className="flex items-start gap-3 text-slate-300">
                      <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden /> {p}
                    </li>
                  ))}
                </ul>
                <p className="mt-8 text-xl font-semibold text-white">Give customers a better way to book.</p>
              </div>
            </div>
          </section>

          {/* ── Core product ── */}
          <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
            <SectionHeading eyebrow="The essentials" title="Everything you need to manage appointments." />
            <div className="grid gap-5 md:grid-cols-2">
              <article className="as-glass rounded-2xl p-6">
                <h3 className="font-semibold text-emerald-300">Online booking page</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Every business gets a simple booking page customers can open from Facebook,
                  Messenger, Instagram, TikTok, Google Business Profile — anywhere you can share a link.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
                  {['Choose Service', 'Choose Date', 'Choose Time', 'Confirm Booking'].map((s, i) => (
                    <span key={s} className="flex items-center gap-1.5">
                      <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">{s}</span>
                      {i < 3 && <span className="text-amber-300" aria-hidden>→</span>}
                    </span>
                  ))}
                </div>
              </article>

              <article className="as-glass rounded-2xl p-6">
                <h3 className="font-semibold text-emerald-300">Appointment calendar</h3>
                <p className="mt-2 text-sm text-slate-300">
                  See today&apos;s appointments, add walk-ins, reschedule, cancel, and block
                  unavailable times — the whole schedule in one organized view.
                </p>
                <div className="mt-4 space-y-1.5 text-xs">
                  <div className="flex justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-300"><span>9:00 AM — Cleaning · Dr. Reyes</span><span className="text-emerald-300">confirmed</span></div>
                  <div className="flex justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-300"><span>10:30 AM — Walk-in · added by staff</span><span className="text-amber-300">manual</span></div>
                  <div className="flex justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-500"><span>12:00 PM — Lunch break</span><span>blocked</span></div>
                </div>
              </article>

              <article className="as-glass rounded-2xl p-6">
                <h3 className="font-semibold text-emerald-300">Customer records</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Contact details, appointment history, notes, upcoming bookings, and no-show
                  history — built automatically from every booking.
                </p>
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs text-slate-300">
                  <p className="font-semibold text-white">Maria Santos · 0917 ··· 4821</p>
                  <p className="mt-1">6 visits · last: Hair color, May 12 · next: Haircut, tomorrow 3:30 PM</p>
                  <p className="mt-1 text-slate-400">Note: prefers ammonia-free color</p>
                </div>
              </article>

              <article className="as-glass rounded-2xl p-6">
                <h3 className="font-semibold text-emerald-300">Business availability</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Working hours, breaks, days off, blocked dates, and service durations — customers
                  only ever see times that can actually be booked.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
                  {['Mon–Sat 9–6', 'Lunch 12–1', 'Sunday off', 'Haircut · 45 min'].map((chip) => (
                    <span key={chip} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">{chip}</span>
                  ))}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
                    Only real slots shown <CheckIcon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </div>
              </article>
            </div>
          </section>

          {/* ── How it works ── */}
          <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
            <SectionHeading eyebrow="Setup" title="Start accepting appointments in minutes." />
            <ol className="grid gap-5 sm:grid-cols-3">
              {[
                { n: '1', t: 'Set up your business', d: 'Add services, prices, business hours, and availability.' },
                { n: '2', t: 'Share your booking link', d: 'Put it on Facebook, Messenger, Instagram, TikTok, your website, or Google Business Profile.' },
                { n: '3', t: 'Manage appointments', d: 'Customers book themselves and appointments appear automatically in the dashboard.' },
              ].map((s) => (
                <li key={s.n} className="as-glass rounded-2xl p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-amber-300 font-bold text-slate-950">{s.n}</span>
                  <h3 className="mt-4 font-semibold text-white">{s.t}</h3>
                  <p className="mt-2 text-sm text-slate-300">{s.d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 text-center">
              <TrackedLink
                href="/appointments/signup"
                event="landing_cta_clicked"
                params={{ location: 'how_it_works' }}
                className="inline-block rounded-xl bg-emerald-500 px-7 py-3.5 font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Create Your Free Booking Page
              </TrackedLink>
            </div>
          </section>

          {/* ── Automation (Pro) ── */}
          <section className="mx-auto max-w-6xl px-4 py-20">
            <SectionHeading
              eyebrow="Pro"
              title="When bookings grow, automate the repetitive work."
              sub="Start manually — it works. When managing bookings starts eating your day, the system grows with you."
            />
            <div className="as-glass rounded-2xl p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-200">
                {['Booking confirmation', 'Appointment reminder', 'Customer arrives', 'Appointment completed'].map((s, i) => (
                  <span key={s} className="flex items-center gap-2">
                    <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">{s}</span>
                    {i < 3 && <span className="text-amber-300" aria-hidden>→</span>}
                  </span>
                ))}
              </div>
              <ul className="mx-auto mt-8 grid max-w-3xl gap-x-8 gap-y-2 text-sm text-slate-300 sm:grid-cols-2">
                {PLAN_BULLETS.pro.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check /> {f}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* ── Who it's for ── */}
          <section className="mx-auto max-w-6xl px-4 py-20">
            <SectionHeading title="Built for businesses that run on appointments." />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {AUDIENCES.map((a) => (
                <div key={a.name} className="as-glass rounded-2xl p-5 text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300" aria-hidden>
                    <a.icon className="h-5 w-5" />
                  </span>
                  <p className="mt-2 font-semibold text-white">{a.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{a.scenario}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Pricing ── */}
          <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
            <SectionHeading
              eyebrow="Pricing"
              title="Start free. Upgrade only when you need more."
              sub="No long-term contracts. Cancel anytime. Upgrade when you need more capacity or automation."
            />
            <div className="grid gap-4 sm:grid-cols-3">
              {PLAN_ORDER.map((tier) => {
                const plan = PLANS[tier]
                const popular = tier === 'pro'
                return (
                  <div
                    key={tier}
                    className={`relative flex flex-col rounded-2xl p-5 ${popular ? 'as-glass-strong border-emerald-400/50 shadow-lg shadow-emerald-500/10' : 'as-glass'}`}
                  >
                    {popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 px-3 py-0.5 text-[11px] font-bold uppercase text-slate-950">
                        Recommended
                      </span>
                    )}
                    <h3 className="font-semibold text-white">{plan.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">{plan.tagline}</p>
                    <p className="mt-3 text-3xl font-bold text-white">
                      {plan.priceMonthly === 0 ? '₱0' : `₱${plan.priceMonthly.toLocaleString('en-PH')}`}
                      <span className="text-sm font-normal text-slate-400">/mo</span>
                    </p>
                    <ul className="mt-4 flex-1 space-y-1.5 text-[13px] text-slate-300">
                      {PLAN_BULLETS[tier].map((f) => (
                        <li key={f} className="flex items-start gap-2"><Check /> <span>{f}</span></li>
                      ))}
                    </ul>
                    {tier !== 'free' && (
                      <p className="mt-3 border-t border-white/10 pt-3 text-xs text-slate-400">
                        + Optional website — ₱{WEBSITE_ADDON_PRICE_YEARLY.toLocaleString('en-PH')}/yr
                      </p>
                    )}
                    <TrackedLink
                      href={`/appointments/signup?plan=${tier}`}
                      event="pricing_plan_selected"
                      params={{ plan: tier }}
                      className={`mt-5 rounded-xl py-2.5 text-center text-sm font-semibold transition ${
                        popular || tier === 'free'
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'border border-white/15 text-slate-100 hover:border-emerald-400'
                      }`}
                    >
                      {PLAN_CTA[tier]}
                    </TrackedLink>
                  </div>
                )
              })}
            </div>

            {/* Comparison table */}
            <div className="mt-10">
              <PlanComparisonTable toggleClassName="as-glass mx-auto flex w-fit cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm text-slate-200 hover:bg-white/10 [&::-webkit-details-marker]:hidden" />
              <p className="mt-3 text-center text-xs text-slate-500">
                Pay online with card or GCash right after signup — instant activation. Prefer to pay manually? That
                works too.
              </p>
            </div>
          </section>

          {/* ── ROI calculator ── */}
          <section className="mx-auto max-w-4xl px-4 py-20">
            <SectionHeading
              eyebrow="Worth it?"
              title="How many bookings does the system need to pay for itself?"
            />
            <RoiCalculator />
          </section>

          {/* ── FAQ ── */}
          <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20">
            <SectionHeading eyebrow="FAQ" title="Common questions." />
            <div className="space-y-3">
              {FAQS.map((f) => (
                <details key={f.q} className="as-glass group rounded-xl px-5 py-4">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium text-white [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="text-slate-400 transition group-open:rotate-45" aria-hidden>＋</span>
                  </summary>
                  <p className="mt-3 text-sm text-slate-300">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ── Final CTA ── */}
          <section className="mx-auto max-w-4xl px-4 py-20">
            <div className="as-glass-strong rounded-3xl p-8 text-center sm:p-12">
              <h2 className="font-[family-name:var(--font-syne)] text-3xl font-bold text-white sm:text-4xl">
                Your next appointment shouldn&apos;t depend on you replying immediately.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-300">
                Create your booking page, share your link, and start organizing appointments in one place.
              </p>
              <TrackedLink
                href="/appointments/signup"
                event="landing_cta_clicked"
                params={{ location: 'final' }}
                className="mt-8 inline-block rounded-xl bg-emerald-500 px-8 py-4 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
              >
                Start Free
              </TrackedLink>
              <p className="mt-3 text-sm text-slate-500">No credit card required.</p>
            </div>
          </section>
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-white/10">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-bold text-white">Appointment <span className="text-emerald-400">System</span></p>
              <p className="mt-2 text-sm text-slate-400">
                Affordable appointment booking for Filipino micro and small businesses.
              </p>
              <p className="mt-4 text-sm text-slate-500">
                Built by <Link href="/" className="text-slate-300 underline-offset-4 hover:text-emerald-300 hover:underline">Cyberussell</Link>
              </p>
            </div>
            <nav aria-label="Product">
              <p className="text-sm font-semibold text-white">Product</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-white">How It Works</a></li>
                <li><Link href="/appointments/login" className="hover:text-white">Sign In</Link></li>
              </ul>
            </nav>
            <nav aria-label="Resources">
              <p className="text-sm font-semibold text-white">Resources</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </nav>
            <nav aria-label="Legal">
              <p className="text-sm font-semibold text-white">Legal</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </nav>
          </div>
          <p className="border-t border-white/10 py-6 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} Cyberussell · Appointment System
          </p>
        </footer>
      </div>
    </div>
  )
}
