@AGENTS.md

# Appointment System

Multi-tenant SaaS booking system for Philippine small businesses (clinics, dental, spa, salon, law, vet). Owners manage services, staff, and schedules in a dashboard. Customers book through a public web page or a Facebook Messenger bot. Billing is in PHP through PayMongo.

It was extracted from the cyberussell.com monorepo, and it still runs as a **Next.js multi-zone** served under `https://www.cyberussell.com/appointments`.

## Stack & commands

- Next.js 16 (App Router, Server Actions), React 19, Tailwind 4, TypeScript, Zod 4
- Supabase (Postgres + Auth + RLS) on a **dedicated** project, separate from the main site's
- PayMongo (billing), Meta Messenger Send API (bot), Nodemailer over Gmail (owner emails)
- `npm run dev` · `npm run build` · `npm run lint` · `npm test` (vitest; `server-only` is stubbed via `vitest.server-only-stub.ts`)

## Layout

| Path | What |
|---|---|
| `src/app/appointments/` | All routes: landing, auth, `dashboard/` (owner), `staff/dashboard/` (staff), `[businessSlug]/` (public booking page), `manage/[code]/` (customer self-service), `api/` |
| `src/app/appointments/actions/*` | Server Actions split by domain. `actions.ts` is a barrel re-export, so import sites don't change |
| `src/lib/appointment-system/` | Core logic: `slots.ts` (availability + booking), `flow.ts` (Messenger state machine), `entitlements.ts` (plans), `auth.ts` (role guards), `paymongo.ts`, `email.ts`, `rateLimit.ts`, `events.ts`/`errors.ts` |
| `src/components/appointment-system/` | UI components |
| `appointment-system/migrations/` | SQL migrations, numbered. Run them by hand in the Supabase SQL editor, in order. There is no migration runner |

`appointment-system/SETUP.md` covers provisioning: env vars, Supabase, PayMongo, Meta app, and operations.

## Hard-wired deployment facts

- `assetPrefix: "/appointments-assets"` stops this zone's `_next/static` from colliding with the main site. Static files that must be served under that prefix live in `public/appointments-assets/`.
- Server Actions `allowedOrigins` = `www.cyberussell.com`, `cyberussell.com`. The Origin header is the proxying domain, not the Vercel domain.
- Absolute URLs are hard-coded to `https://www.cyberussell.com/appointments/...`: auth redirects, PayMongo success/cancel URLs, manage links, the Messenger booking-page link. Change them all together.
- Env vars: `NEXT_PUBLIC_BOOKLYPRO_SUPABASE_URL`, `NEXT_PUBLIC_BOOKLYPRO_SUPABASE_ANON_KEY`, `BOOKLYPRO_SUPABASE_SERVICE_ROLE_KEY`, `PAYMONGO_SECRET_KEY`, `APPOINTMENTS_PAYMONGO_WEBHOOK_SECRET`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `CRON_SECRET`. The `BOOKLYPRO_` prefix is a legacy name. Keep it.
- Default timezone is `Asia/Manila`. Bot copy is Taglish ("po", "Salamat po"). Keep that tone in customer-facing Messenger text.

---

## Business rules

### Plans & entitlements (`src/lib/appointment-system/entitlements.ts`)

**All plan gating goes through `entitlements.ts`.** Never write `plan_tier === 'pro'` elsewhere. Use `hasFeature()`, `getFeatureLimit()`, `canCreateAppointment()`, or `canAddProvider()`, or add a flag or limit there.

| Plan | Price (PHP/mo) | Appointments/month | Staff (active) | Features |
|---|---|---|---|---|
| Free | 0 | 100 | 1 | public booking page, calendar, clients & notes, no-show tracking, services, hours, breaks/blocked dates, cancel/reschedule, manual/walk-in bookings |
| Basic | 299 | unlimited | 5 | + `email_notifications`, `basic_reporting` |
| Pro | 499 | unlimited | unlimited | + `messenger_booking_bot`, `messenger_reminders` |

- Only **shipped and enforced** features may appear as `FeatureFlag`s or in `PLAN_BULLETS` / `PLAN_CHECKOUT_SUMMARY`. Don't pre-declare flags, and don't advertise "Soon" or roadmap features. Calendar sync, waitlist, SMS reminders, deposits, white label, export, recurring appointments, and memberships were removed from the pricing copy for this reason.
- `PLAN_BULLETS` is the single source for both the landing page and the Billing tab. `PLAN_CHECKOUT_SUMMARY` is what appears on the PayMongo checkout and must list only real features.
- The monthly quota counts appointments **created** this calendar month (UTC month start), from all sources, excluding `cancelled`. It is computed live from `appointments`. There are no counter tables.
- The staff limit counts `staff` rows where `active = true`.
- Quota enforcement:
  - Web booking: returns 403 "cannot accept more online bookings" and logs `booking_blocked_quota`.
  - Messenger: hands off to a human and logs `booking_blocked_quota`.
  - Manual booking: shows an error prompting an upgrade.
- Feature gates:
  - Email: `sendNewBookingEmail` gates itself, so callers don't check.
  - Messenger bot: below Pro, the bot replies only with a link to the public booking page, and the FB connection can't be saved.
  - Reports page: gated by `basic_reporting`.
- History: an `ai_receptionist` tier existed and was dropped (migration 009, folded into Pro). Pro was cut from ₱699 to ₱499 so its price matches the ROI pitch.

### Website add-on

- ₱2,999/year, **Basic/Pro only**. `hasWebsiteAddon()` returns false on Free even if an expiry date is set.
- It is per-business purchased state (`website_addon_expires_at`), **not** a feature flag.
- It can be bought standalone (`kind: 'addon'`) or bundled as a second line item on a plan checkout (`includes_addon: 'true'`). If the add-on is already active, it is not re-offered in the plan checkout.
- The app only records the purchase. Building the website is done manually.

### Billing lifecycle (PayMongo "Pay Now", not PayMongo Subscriptions)

- PayMongo's Subscriptions API isn't enabled on the account. Each cycle is instead a one-off hosted Checkout Session (card + GCash).
- New signups start on `free` / `active`. The 14-day `trial` status is legacy.
- Checkout: the server action creates a session, stores `paymongo_checkout_session_id` (or `website_addon_checkout_session_id`), and returns `checkoutUrl`. The **client** then does `window.location.href = checkoutUrl`, because `redirect()` from a `useActionState` action doesn't reliably navigate to an external origin.
- Webhook `api/paymongo/webhook`:
  - Verifies the HMAC over `${t}.${rawBody}` and accepts either the `te` or `li` signature.
  - On `checkout_session.payment.paid` for a plan checkout, sets `plan_tier`, `plan_status='active'`, and `plan_renews_at = now + 30 days`.
  - On an add-on payment, sets `website_addon_expires_at = now + 365 days`.
  - **Stale-webhook guard:** the update only applies where the stored session id equals the paid session's id. Plan and add-on checkouts use separate columns so they can be in flight at the same time.
  - A downgrade is paid the same way, at the lower tier's price. The webhook detects it by comparing positions in `PLAN_ORDER` and writes `settings.downgrade_notice`, which appears once on the dashboard.
  - Failures after signature verification are logged to `events` (type `error`) and return 500, because a customer paid and the failure must stay traceable.
- **Lazy suspension:** there is no cron. When a dashboard loads (`requireBusiness` / `requireBusinessAccess`), a business that is `active` with `plan_renews_at` in the past is flipped to `suspended`, using the admin client.
- **Suspended** means:
  - The public page returns 404.
  - The book, services, and staff APIs return 404.
  - The Messenger webhook skips the business silently.
  - The owner still sees the dashboard, with a banner.
- Billing columns (`plan_tier`, `plan_status`, `plan_renews_at`, add-on columns, session ids) are **service-role-only**. Migration 011 revokes `UPDATE` on `businesses` from `authenticated` and grants back only `name, phone, address, settings, fb_page_id`. Any new owner-editable column needs an explicit grant. New billing columns are protected by default.

### Availability & slot generation (`slots.ts#getAvailableSlots`)

- A slot requires **all** of the following:
  - The staff member is active.
  - The staff member is eligible for the service.
  - The weekday has a per-staff `availability` window.
  - The slot does not overlap that staff member's `availability_breaks`.
  - No `blocked_dates` row covers the date, either for that staff member or for the whole business (`staff_id = null`).
  - There is no overlap with that staff member's `pending`/`confirmed` appointments.
- Slots step by the **service duration** from the window start. A slot must fit entirely before the window closes.
- **Minimum lead time is 30 minutes** from now.
- **The booking window is 7 days**, the same on web and Messenger. The day loop includes both ends (today + 7).
- Use `limit: 500` wherever slots are listed for a week. The count is across all staff combined, and lower limits (24/60/100) silently cut the window to 1–2 days. This happened with a live customer.
- All wall-clock math is done in the **business timezone** (`zonedToUtc`, `dateInTz`, `wallTimeToUtc`). Never use server-local dates for this.
- **Business hours** (`settings.hours`, one entry per weekday, `null` = closed) gate whether the business accepts online bookings at all (`hasConfiguredHours`). They do **not** constrain per-staff slots.
- **Temporarily closed** (`settings.closed` + `closed_message`, max 300 chars) pauses web and Messenger booking and shows the message.

### Staff ↔ service eligibility (`staff_services`, migration 020)

- A staff member with **zero** `staff_services` rows is **unrestricted** and can perform any service. Restriction starts only once at least one service is assigned. This rule is applied the same way in `getAvailableSlots`, `bookAppointment` (checked again server-side), and `GET api/staff`.
- `GET api/staff` always returns `serviceIds` (`null` = unrestricted) so clients can filter in either direction from one fetch.

### Booking (`slots.ts#bookAppointment`)

- It checks that `service_id` and `staff_id` belong to `business_id`. The public API runs on the admin client, so RLS won't catch cross-tenant IDs.
- **Double-booking is prevented in the database** by the exclusion constraint `no_double_booking` on (`staff_id`, `tstzrange`) where status is in (`pending`, `confirmed`). Map error `23P01` to a "slot just taken" conflict. Never rely on app-side checks alone.
- Client matching:
  - Messenger: by `messenger_psid`.
  - Web and manual: by `phone` where `messenger_psid is null`.
  - When a client is found, their name and phone are updated.
- New appointments are inserted as `confirmed`. `ends_at` = `starts_at` + service duration.
- The **reference code** is 6 random digits, unique, and retried up to 3 times on collision. **The code is the customer's credential** for `/appointments/manage/[code]`, which is unauthenticated by design. Because the code space is small, the manage page lookup and the cancel/reschedule actions share a rate limit of 20 per minute per IP (`manage:{ip}`).
- **One booking per client per day on self-service channels** (web and Messenger), using the business-timezone calendar day (`hasSameDayBooking`). Staff manual bookings skip this check.
- Web booking validation:
  - Phone must match PH mobile `09XXXXXXXXX` (spaces and dashes are stripped).
  - Name must be 2–80 characters.
  - Note is at most 500 characters.
  - Rate limit: 10 per minute per IP.
- After a web or Messenger booking: log `booking_created`, send the owner email (Basic+), and return or show the manage URL. The web flow also returns a QR code.

### Appointment statuses

`pending | confirmed | completed | cancelled | no_show`. Only `pending`/`confirmed` hold a slot.

- Dashboard (owner or staff) can set `confirmed`, `completed`, `cancelled`, or `no_show`, reschedule (which resets status to `confirmed`), and record a payment.
- Recording a payment sets `amount_paid`. `paid_at` is set to midday business time on the chosen date, or `null` when the amount is 0.
- Customer self-service by reference code:
  - Can cancel or reschedule unless the booking is already `cancelled` or `completed`.
  - Rescheduling resets status to `confirmed`.
  - A reschedule is accepted only if the chosen staff member and start time match a slot `getAvailableSlots` offers for the booking's service (7 days, limit 500). This one check enforces staff ownership, eligibility, hours, lead time and the booking window. It is also refused when the business is suspended, closed, or has no hours set.
- Sources: `web | messenger | manual`.

### Messenger bot (`flow.ts`, `api/messenger/webhook`)

- The flow is **buttons only**. There is no AI or free-text understanding (the Haiku receptionist was removed). Free text outside the name/phone steps returns the user to the main menu.
- Checks run in this order: business closed → hours not configured → below Pro (reply with booking-page link) → human mode → payload or text routing.
- Steps:
  1. Main menu: Book / Ask / Talk to staff.
  2. Service (quick replies, at most 12 services shown).
  3. **Day**, skipped when only one day has openings.
  4. Time, de-duplicated by start time.
  5. Staff, asked only if more than one staff member is free at that time.
  6. Name and phone, skipped for a returning PSID that already has both on file.
  7. Book.
- The day step exists because Messenger quick replies cap at **13**, and a single day can fill that on its own.
- Payload formats:
  - `SERVICE_{id}`
  - `DAY_{serviceId}_{YYYY-MM-DD}` (parsed from the end)
  - `TIME_{epochMs}`
  - `STAFF_{staffId}_{epochMs}`
- If the slot is taken at confirm time, the bot shows the **same day's** other times rather than going back to day selection.
- **Human handoff:** `mode='human'` silences the bot until staff hand back (`resumeBot`), the user sends `BOT_RESUME`, or **12 hours** of inactivity pass.
- **Day-before reminders** (`reminders.ts`, Pro, `messenger_reminders`):
  - Vercel Cron (`vercel.json`) calls `GET /appointments/api/cron/reminders` once a day at 10:00 UTC (18:00 Manila). The route rejects any request without `Authorization: Bearer $CRON_SECRET`.
  - A reminder goes to every `pending`/`confirmed` appointment on **tomorrow's date in the business timezone** whose client has a `messenger_psid`. Suspended businesses and plans below Pro are skipped. Web-only clients get no reminder, because SMS isn't built.
  - Reminders are sent with the `CONFIRMED_EVENT_UPDATE` message tag so they can go out after Messenger's 24-hour window has closed.
  - `reminder_sent_at` makes re-runs idempotent. **Every reschedule path must reset it to `null`.**
  - Each send logs `reminder_sent` or `reminder_failed`.
- The webhook verifies `X-Hub-Signature-256`, routes by page id (`fb_page_id`) to the business, reads the page token from `business_secrets`, ignores echoes, and **always returns 200** so Meta doesn't retry-storm the endpoint. Errors for each entry are logged to `events`.
- FB connection (v1): the owner pastes the Page ID and Page Access Token. Tokens live in `business_secrets`, which has RLS on and no policies, so only the service role can read them. OAuth is planned for after Meta app review.

### Roles & access (`auth.ts`, RLS)

- **One owner ↔ one business.** A staff login belongs to exactly one business (unique `staff.profile_id`).
- `requireBusiness()` is for **owner-only** pages and actions: billing, settings, staff, services, availability.
  - A staff user who reaches an owner-only page goes to `/not-authorized`.
  - A user with no business goes to signup.
- `requireStaffAccess()` is for staff dashboard pages.
- `requireBusinessAccess()` is for operational actions shared by both roles: appointments, clients, conversations. RLS limits what each role can write.
- Staff RLS:
  - Read-only on the business, services, staff, availability, breaks, blocked dates, and `staff_services`.
  - Read, insert, and update (**no delete**) on clients and appointments.
  - Read and update on conversations. Only the webhook inserts conversations.
- The **staff dashboard shows only that staff member's own appointments** (filtered by `staff_id`), not the whole business calendar.
- RLS helpers `is_business_owner` and `is_business_staff` must stay `security definer`. Without it they recurse infinitely (migration 016).
- Staff invite: `inviteUserByEmail` with redirect `/appointments/staff/accept-invite`. `profile_id` is set at **invite** time, not when the invite is accepted. Resending is safe, and Supabase rejects it once the staff member has confirmed.

### Auth & signup

- Signup takes full name, business name, at least one business type, email, and a password of 8+ characters. Rate limit: 5 per minute per IP. Login rate limit: 10 per minute per IP.
- The business row is created with the **service role**, so signup still works when email confirmation leaves no session yet.
- The slug is `slugify(name)`, up to 50 characters. A name shorter than 3 characters gets a `business-` prefix. If the slug is taken, a random 4-character suffix is added. Always use `uniqueBusinessSlug()` from `slug.ts`.
- Supabase returns a user with empty `identities` for an existing email. Treat that as "account already exists".
- `emailRedirectTo` must be set, or the confirmation link lands on the main site's homepage.
- `selected_plan_tier` records the pricing CTA the user signed up from. It is shown only as a nudge in the setup checklist. **First login always goes to the dashboard, not Billing**, so the business isn't pushed to pay before it can take a booking.
- Sentinel strings in `ActionResult.error` are shown as info rather than errors: `CONFIRM_EMAIL`, `EMAIL_NOT_CONFIRMED`, `SENT`, `DONE`.

### Business types & terminology (`terminology.ts`)

- `business_types` is a multi-select array. The **first** entry drives user-facing vocabulary (clinic/patient/doctor, salon/client/stylist, vet clinic/pet owner/veterinarian, and so on).
- DB table names are generic (`businesses`, `clients`). Only the UI wording changes by type. Vertical-specific data goes in `metadata` jsonb, not new columns.

### Services

- Duration must be 5–480 minutes (enforced by a DB check). Price must be at least 0. Services are edited inline.
- Services can be toggled `active` or deleted. Only active services appear on the public page, the API, and the bot.

---

## Engineering conventions & decisions

- **Rate limiting** (`rateLimit.ts`) is a fixed 60-second window stored in `rate_limits`. It **fails open**: a DB error must never block a booking or login.
- **Events:** `logEvent()` never throws, and analytics must never break the booking path. Everything is logged from day one (bookings, status changes, handoffs, invites, payments) to support later features such as no-show prediction and recall campaigns. Unexpected failures go through `logError()` into the same `events` table (type `error`). There is no separate error service.
- **Public page caching:**
  - `[businessSlug]/page.tsx` data is wrapped in `unstable_cache` (60 seconds) and tagged with `businessPageCacheTag(slug)` from `cacheTags.ts`.
  - A route-level `revalidate` export doesn't work on this route.
  - Mutations that change what the public page shows (profile, closed notice, hours, services) must call `updateTag(businessPageCacheTag(slug))`.
- **Server-side IDs:** mutations always add `.eq('business_id', business.id)` in addition to the id filter. Validate form input with Zod.
- **Admin vs. session client:** use `createServerSupabase()` (RLS applies) for owner and staff work. Use `createAdminSupabase()` (service role, bypasses RLS) only for webhooks, public APIs, signup, billing-column writes, and secrets. Never use it in client code.
- **Forms:** use the shared `SubmitButton` (`useFormStatus`) for pending state on every submit button.
- **Supabase keepalive** (free tier): the `keepalive_heartbeat` singleton is updated both by an external cron (anon key, which needs **both** the SELECT and UPDATE policies) and by the internal `pg_cron` job every 12 hours. A read-only ping does not reset the inactivity clock.
- **Migrations:** add the next number in `appointment-system/migrations/` and end the file with the "(run in the Appointment System Supabase SQL editor)" note. Call out in the commit message that it must be run manually before the code works.

## Not built (don't advertise these)

- Deposits: the `deposit_*` columns are scaffolding only.
- SMS, calendar sync, waitlist, and data export are not built.
