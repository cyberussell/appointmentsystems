import { notFound } from 'next/navigation'
import Image from 'next/image'
import { unstable_cache } from 'next/cache'
import { MessageCircle, MapPin, Phone } from 'lucide-react'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import type { Business, Service } from '@/lib/appointment-system/types'
import { getTerms } from '@/lib/appointment-system/terminology'
import { hasConfiguredHours } from '@/lib/appointment-system/slots'
import BookingWidget from '@/components/appointment-system/BookingWidget'
import { businessPageCacheTag } from '@/lib/appointment-system/cacheTags'

// This page's rendered output only ever includes owner-driven data (business
// info, service list) — real-time slot availability is fetched client-side
// by BookingWidget via a separate API call, never baked into this HTML, so
// caching the shell can't show stale availability.
//
// Supabase's client makes its own fetch() calls that Next doesn't cache by
// default (this is the "previous", non-cacheComponents model — see
// node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md),
// so a plain `export const revalidate` on this route does nothing on its
// own: nothing here is a cacheable fetch for Next to apply it to. The data
// fetch itself has to be wrapped in unstable_cache. Mutations that should
// show up immediately (closed notice, profile, services) call
// revalidatePath on this route, which invalidates this tagged cache entry
// too, ahead of the 60s timer.
const getPublicBusinessPageData = (slug: string) =>
  unstable_cache(
    async () => {
      const db = createAdminSupabase()
      const { data: businessRow } = await db.from('businesses').select('*').eq('slug', slug).maybeSingle()
      if (!businessRow) return null
      const business = businessRow as Business

      const { data: services } = await db
        .from('services')
        .select('*')
        .eq('business_id', business.id)
        .eq('active', true)
        .order('created_at')

      const { count: staffCount } = await db
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .eq('active', true)

      return { business, services: services ?? [], staffCount: staffCount ?? 0 }
    },
    [`business-page-${slug}`],
    { revalidate: 60, tags: [businessPageCacheTag(slug)] }
  )()

// Public business page: Messenger is the primary CTA; the web form is the
// fallback for clients arriving from Google instead of Facebook.
export default async function BusinessPublicPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  const data = await getPublicBusinessPageData(businessSlug)
  if (!data) notFound()
  const { business, services, staffCount } = data
  if (business.plan_status === 'suspended') notFound()

  const closed = (business.settings as { closed?: boolean }).closed
  const hoursConfigured = hasConfiguredHours(business)
  const acceptingBookings = !closed && hoursConfigured

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(16,185,129,0.14), transparent 70%)',
        }}
        aria-hidden
      />

      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-20">
        <header className="text-center">
          <Image
            src="/appointments-assets/appointment-logo.png"
            alt=""
            width={80}
            height={80}
            className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-lg shadow-emerald-500/20 sm:h-20 sm:w-20"
            priority
            unoptimized
          />
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{business.name}</h1>
          {(business.address || business.phone) && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-slate-400">
              {business.address && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {business.address}
                </span>
              )}
              {business.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {business.phone}
                </span>
              )}
            </div>
          )}
          <a
            href={`/appointments/manage?from=${business.slug}`}
            className="mt-4 inline-block text-xs font-medium text-slate-500 underline underline-offset-4 transition hover:text-emerald-400"
          >
            Already booked? Manage your booking
          </a>
        </header>

        {closed && (
          <div className="mt-10 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-6 text-center backdrop-blur-xl">
            <p className="font-semibold text-amber-300">Temporarily closed</p>
            <p className="mt-1.5 text-sm text-slate-300">
              {(business.settings as { closed_message?: string }).closed_message ||
                'Online booking is paused for now — please check back soon.'}
            </p>
          </div>
        )}

        {!closed && !hoursConfigured && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur-xl">
            <p className="font-semibold text-slate-300">Not accepting online bookings yet</p>
            <p className="mt-1.5 text-sm text-slate-400">
              {`This ${getTerms(business.business_types).business} hasn't set up its booking hours yet — please check back soon.`}
            </p>
          </div>
        )}

        {acceptingBookings && business.fb_page_id && (
          <a
            href={`https://m.me/${business.fb_page_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-center font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:bg-emerald-400 hover:shadow-emerald-500/30 active:scale-[0.99]"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Message us on Facebook to book
          </a>
        )}

        {acceptingBookings && (
          <div className="mt-12">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
              {business.fb_page_id ? 'Web booking' : 'Booking'}
            </p>
            <h2 className="mt-1.5 text-center text-xl font-semibold text-white sm:text-2xl">
              {business.fb_page_id ? 'Or book here on the web' : 'Book an appointment'}
            </h2>
            <div className="mt-6">
              <BookingWidget
                businessSlug={business.slug}
                businessNoun={getTerms(business.business_types).business}
                services={(services ?? []) as Service[]}
                showStaffNames={(staffCount ?? 0) > 1}
                timezone={business.timezone}
              />
            </div>
          </div>
        )}

        <footer className="mt-16 text-center text-xs text-slate-600">
          Powered by <span className="text-slate-500">Cyberussell Appointment System</span>
        </footer>
      </div>
    </main>
  )
}
