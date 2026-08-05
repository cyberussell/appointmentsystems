import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Appointment System',
  description: 'Privacy Policy for the Appointment System platform, operated by Payjobs.work Manpower Services.',
}

const EFFECTIVE_DATE = 'July 26, 2026'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/appointments" className="font-bold text-white tracking-tight">
            Appointment <span className="text-emerald-400">System</span>
          </Link>
          <Link href="/appointments" className="text-sm text-slate-300 hover:text-white transition">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-bold text-3xl sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-400">Effective date: {EFFECTIVE_DATE}</p>

        <div className="mt-10 space-y-10 text-slate-300 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-3 [&_p]:leading-relaxed [&_li]:leading-relaxed">
          <section>
            <p>
              Appointment System (the &ldquo;Service&rdquo;) is operated by <strong className="text-white">Payjobs.work Manpower Services</strong>,
              located in Luna, Roxas, Isabela, Philippines (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). This Privacy Policy explains what
              information we collect from businesses that use the Service (&ldquo;Business Customers&rdquo;) and from their clients who book
              appointments (&ldquo;Clients&rdquo;), how we use it, and the choices you have.
            </p>
          </section>

          <section>
            <h2>1. Information We Collect</h2>
            <p>We collect the following categories of information:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white">Account information:</strong> name, email address, phone number, business name, and password,
                provided when a Business Customer signs up for the Service.
              </li>
              <li>
                <strong className="text-white">Booking information:</strong> names, phone numbers, and appointment details that Clients
                provide when booking an appointment with a Business Customer.
              </li>
              <li>
                <strong className="text-white">Messaging information:</strong> if a Business Customer connects a Facebook Page, messages
                exchanged with Clients through Facebook Messenger are processed by the Service to schedule and manage appointments.
              </li>
              <li>
                <strong className="text-white">Payment information:</strong> subscription and appointment payments are processed by our
                third-party payment processor, PayMongo. We do not store full card or bank account numbers on our own servers.
              </li>
              <li>
                <strong className="text-white">Usage data:</strong> log data, device and browser information, and analytics events
                generated while using the Service.
              </li>
            </ul>
          </section>

          <section>
            <h2>2. How We Use Information</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>To provide, operate, and maintain the Service, including scheduling, reminders, and staff coordination.</li>
              <li>To process payments and manage subscriptions.</li>
              <li>To send transactional notifications, such as booking confirmations and reminders.</li>
              <li>To respond to support requests and communicate with Business Customers about their account.</li>
              <li>To monitor, secure, and improve the Service, and to detect and prevent fraud or abuse.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Share Information</h2>
            <p>We do not sell personal information. We share information only as follows:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white">With the Business Customer:</strong> a Client&rsquo;s booking and messaging information is
                shared with the Business Customer they are booking with, so the appointment can be fulfilled.
              </li>
              <li>
                <strong className="text-white">Service providers:</strong> we use third parties to help operate the Service, including
                Supabase (database and authentication hosting), PayMongo (payment processing), and Meta Platforms, Inc. (Facebook
                Messenger integration). These providers process data only as needed to perform their function for us.
              </li>
              <li>
                <strong className="text-white">Legal requirements:</strong> we may disclose information if required by law, or to
                protect the rights, property, or safety of Payjobs.work Manpower Services, our users, or others.
              </li>
              <li>
                <strong className="text-white">Business transfers:</strong> information may be transferred as part of a merger,
                acquisition, or sale of assets.
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Data Retention</h2>
            <p>
              We retain account and booking information for as long as an account is active, and for a reasonable period afterward to
              comply with legal, accounting, or reporting obligations. A Business Customer may request deletion of their account and
              associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2>5. Data Security</h2>
            <p>
              We use reasonable administrative, technical, and physical safeguards designed to protect information from unauthorized
              access, disclosure, alteration, or destruction. No method of transmission or storage is completely secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>6. Your Rights</h2>
            <p>
              Depending on your location, you may have rights under applicable data protection law, such as the Philippine Data
              Privacy Act of 2012, to access, correct, or request deletion of your personal information. To exercise these rights,
              contact us using the details below.
            </p>
          </section>

          <section>
            <h2>7. Children&rsquo;s Privacy</h2>
            <p>
              The Service is intended for use by businesses and their adult clients. We do not knowingly collect personal information
              from children under 13.
            </p>
          </section>

          <section>
            <h2>8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be reflected by updating the effective date
              above. Continued use of the Service after changes take effect constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2>9. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or how your information is handled, contact:
            </p>
            <p className="mt-3">
              <strong className="text-white">Payjobs.work Manpower Services</strong>
              <br />
              Luna, Roxas, Isabela, Philippines
              <br />
              Email: <a href="mailto:support@payjobs.work" className="text-emerald-400 hover:underline">support@payjobs.work</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
