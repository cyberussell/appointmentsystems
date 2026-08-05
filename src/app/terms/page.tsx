import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Appointment System',
  description: 'Terms of Service for the Appointment System platform, operated by Payjobs.work Manpower Services.',
}

const EFFECTIVE_DATE = 'July 26, 2026'

export default function TermsOfServicePage() {
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
        <h1 className="font-bold text-3xl sm:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-slate-400">Effective date: {EFFECTIVE_DATE}</p>

        <div className="mt-10 space-y-10 text-slate-300 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-3 [&_p]:leading-relaxed [&_li]:leading-relaxed">
          <section>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern access to and use of Appointment System (the &ldquo;Service&rdquo;),
              operated by <strong className="text-white">Payjobs.work Manpower Services</strong>, located in Luna, Roxas, Isabela,
              Philippines (&ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By creating an account or using the
              Service, you agree to these Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2>1. The Service</h2>
            <p>
              Appointment System provides an online booking page, appointment scheduling, client management, and related tools for
              small businesses (&ldquo;Business Customers&rdquo;), including optional integrations such as Facebook Messenger and online
              payments through PayMongo.
            </p>
          </section>

          <section>
            <h2>2. Accounts</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.</li>
              <li>You must notify us promptly of any unauthorized use of your account.</li>
              <li>You must be at least 18 years old, or the age of majority in your jurisdiction, to create a Business Customer account.</li>
            </ul>
          </section>

          <section>
            <h2>3. Plans, Billing, and Payments</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>The Service may offer a free plan and one or more paid subscription plans, as described on our pricing page.</li>
              <li>Paid subscriptions are billed in advance on a recurring basis until cancelled.</li>
              <li>Payments are processed by PayMongo. By subscribing, you also agree to PayMongo&rsquo;s applicable terms.</li>
              <li>Fees are non-refundable except where required by law or expressly stated otherwise.</li>
              <li>We may change our pricing with reasonable advance notice; continued use after a price change takes effect constitutes acceptance.</li>
            </ul>
          </section>

          <section>
            <h2>4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Use the Service for any unlawful purpose or in violation of any applicable law or regulation.</li>
              <li>Send spam, unsolicited messages, or abuse the Messenger integration.</li>
              <li>Attempt to gain unauthorized access to the Service, other accounts, or related systems.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Reverse engineer, resell, or white-label the Service without our written permission.</li>
            </ul>
          </section>

          <section>
            <h2>5. Business Customer Responsibilities</h2>
            <p>
              As a Business Customer, you are responsible for the accuracy of the services, pricing, and availability you publish
              through the Service, and for honoring appointments booked by your Clients. You are responsible for obtaining any
              consents required from your Clients to contact them and to process their personal information, including through
              Facebook Messenger where applicable.
            </p>
          </section>

          <section>
            <h2>6. Client Bookings</h2>
            <p>
              Clients who book appointments through the Service do so directly with the Business Customer. The Company is not a
              party to, and is not responsible for, the services rendered by the Business Customer, or any dispute between a
              Business Customer and a Client.
            </p>
          </section>

          <section>
            <h2>7. Intellectual Property</h2>
            <p>
              The Service, including its software, design, and branding, is owned by Payjobs.work Manpower Services and is protected
              by applicable intellectual property laws. These Terms do not grant you any ownership rights in the Service. Content you
              submit to the Service (such as business details and client information) remains yours; you grant us a license to host,
              process, and display it as needed to operate the Service.
            </p>
          </section>

          <section>
            <h2>8. Termination</h2>
            <p>
              You may stop using the Service and cancel your account at any time. We may suspend or terminate your access to the
              Service if you violate these Terms, misuse the Service, or fail to pay applicable fees, with notice where reasonably
              practicable.
            </p>
          </section>

          <section>
            <h2>9. Disclaimers</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied,
              including warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee
              that the Service will be uninterrupted, error-free, or fully secure.
            </p>
          </section>

          <section>
            <h2>10. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Payjobs.work Manpower Services will not be liable for any indirect,
              incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or business
              opportunity, arising from your use of the Service. Our total liability for any claim arising out of these Terms or
              the Service will not exceed the amount you paid us in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2>11. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be reflected by updating the effective date above.
              Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2>12. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Republic of the Philippines, without regard to conflict-of-law
              principles. Any dispute arising from these Terms or the Service will be subject to the exclusive jurisdiction of the
              courts of Isabela, Philippines.
            </p>
          </section>

          <section>
            <h2>13. Contact Us</h2>
            <p>Questions about these Terms can be directed to:</p>
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
