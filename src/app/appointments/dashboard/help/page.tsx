import Link from 'next/link'
import { Bot, CalendarPlus, CircleHelp, CreditCard, DoorClosed, MessageCircle, Rocket } from 'lucide-react'
import { requireBusiness } from '@/lib/appointment-system/auth'
import { getTerms } from '@/lib/appointment-system/terminology'

export const dynamic = 'force-dynamic'

export default async function HelpPage() {
  const { business } = await requireBusiness()
  const t = getTerms(business.business_types)

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Help</h1>
        <p className="text-slate-400 text-sm mt-1">
          Everything you need to get your {t.business} fully set up.
        </p>
      </div>

      <HelpCard title="Quick start checklist" icon={<Rocket className="h-4 w-4" aria-hidden />} defaultOpen>
        <ol className="list-decimal list-inside space-y-2">
          <li>
            <strong>Services</strong> — add what {t.clients} can book (name, duration, price).
          </li>
          <li>
            <strong>Staff</strong> — add your {t.provider}s.
          </li>
          <li>
            <strong>Availability</strong> — set each staff member&apos;s working hours. Open slots
            are computed from these.
          </li>
          <li>
            <strong>Test it</strong> — open your public page{' '}
            <Link href={`/appointments/${business.slug}`} className="text-emerald-400 underline">
              /appointments/{business.slug}
            </Link>{' '}
            and book a test appointment.
          </li>
          <li>
            <strong>Connect Facebook</strong> — so {t.clients} can book by messaging your Page (guide
            below).
          </li>
        </ol>
      </HelpCard>

      <HelpCard title="How do I connect my Facebook Page?" icon={<MessageCircle className="h-4 w-4" aria-hidden />}>
        <p>
          During early access, we connect your Page <strong>together with you</strong> — it takes
          about 15 minutes on a video call or chat. Here&apos;s what happens:
        </p>
        <ol className="list-decimal list-inside space-y-2 mt-3">
          <li>
            You tell us your <strong>Facebook Page name/link</strong> via the{' '}
            <Link href="/contact" className="text-emerald-400 underline">
              contact page
            </Link>
            .
          </li>
          <li>
            We send you a <strong>tester invite</strong> from our Meta app — you accept it with the
            Facebook account that admins your Page.
          </li>
          <li>
            We generate your <strong>Page ID</strong> and <strong>Page Access Token</strong> with
            you, and you paste them in{' '}
            <Link href="/appointments/dashboard/settings" className="text-emerald-400 underline">
              Settings → Facebook Page connection
            </Link>
            .
          </li>
          <li>
            You message your own Page to test — the bot should greet you with the booking menu.
          </li>
        </ol>
        <p className="mt-3 text-slate-400">
          Requirements: you must be an <strong>admin</strong> of the Facebook Page, and the Page
          must allow messaging.
        </p>
      </HelpCard>

      <HelpCard title="What does the Messenger bot do?" icon={<Bot className="h-4 w-4" aria-hidden />}>
        <ul className="list-disc list-inside space-y-2">
          <li>Greets {t.clients} who message your Page and shows booking buttons.</li>
          <li>Shows only real open slots (your staff hours minus booked appointments).</li>
          <li>Understands free text in English, Tagalog, or Taglish — &ldquo;pwede ba bukas hapon?&rdquo; works.</li>
          <li>Saves details {t.clients} mention as intake notes for the {t.provider}.</li>
          <li>
            Hands over to you when a {t.client} asks for a person — reply in your normal{' '}
            <strong>Page inbox</strong>, then press &ldquo;Hand back to bot&rdquo; in{' '}
            <Link href="/appointments/dashboard/conversations" className="text-emerald-400 underline">
              Conversations
            </Link>
            .
          </li>
        </ul>
      </HelpCard>

      <HelpCard title={`How do I close the ${t.business} temporarily?`} icon={<DoorClosed className="h-4 w-4" aria-hidden />}>
        <p>
          Go to{' '}
          <Link href="/appointments/dashboard/settings" className="text-emerald-400 underline">
            Settings → Business status
          </Link>
          , tick &ldquo;Temporarily closed&rdquo;, and write the message {t.clients} should
          see (e.g. &ldquo;Closed for the holidays, back January 3&rdquo;). The Messenger bot and
          your public booking page will show that message and stop taking bookings until you reopen.
        </p>
      </HelpCard>

      <HelpCard title="How do I add a walk-in or phone booking?" icon={<CalendarPlus className="h-4 w-4" aria-hidden />}>
        <p>
          Open{' '}
          <Link href="/appointments/dashboard/appointments" className="text-emerald-400 underline">
            Appointments
          </Link>{' '}
          and use the &ldquo;Add appointment (walk-in / phone)&rdquo; form under the calendar. To
          move an appointment, press <strong>Reschedule</strong> on any booking. The system blocks
          double-booking the same staff member automatically.
        </p>
      </HelpCard>

      <HelpCard title="Billing & plans" icon={<CreditCard className="h-4 w-4" aria-hidden />}>
        <p>
          Your plan and payment instructions are in{' '}
          <Link href="/appointments/dashboard/settings" className="text-emerald-400 underline">
            Settings → Billing
          </Link>
          . We accept GCash and bank transfer; your account activates within 24 hours of payment.
          Plans: Basic ₱999 · Pro ₱1,999 · Premium ₱3,499 per month.
        </p>
      </HelpCard>

      <HelpCard title="Something else?" icon={<CircleHelp className="h-4 w-4" aria-hidden />}>
        <p>
          Message us through the{' '}
          <Link href="/contact" className="text-emerald-400 underline">
            contact page
          </Link>{' '}
          — include your business name (<strong>{business.name}</strong>) so we can help faster.
        </p>
      </HelpCard>
    </div>
  )
}

function HelpCard({
  title,
  icon,
  children,
  defaultOpen,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      className="group rounded-xl border border-slate-800 bg-slate-900 open:border-emerald-500/30"
      open={defaultOpen}
    >
      <summary className="cursor-pointer select-none px-5 py-4 font-semibold text-slate-200 hover:text-emerald-300 transition list-none flex items-center justify-between">
        <span className="flex items-center gap-2">
          {icon && <span className="text-emerald-300">{icon}</span>}
          {title}
        </span>
        <span className="text-slate-500 group-open:rotate-90 transition-transform">›</span>
      </summary>
      <div className="px-5 pb-5 text-sm text-slate-300 space-y-2">{children}</div>
    </details>
  )
}
