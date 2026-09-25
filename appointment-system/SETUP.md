# Appointment System Setup Guide

Appointment System is a subscription booking app for clinics, spas, salons, law offices, and vet clinics. It is a standalone Next.js app, deployed as a **multi-zone** behind `https://www.cyberussell.com/appointments`. It runs on its **own Supabase project**, separate from the main site's.

Code layout:

- `src/app/appointments/`: routes (landing, auth, owner and staff dashboards, public booking page, manage-by-code, API and webhooks)
- `src/lib/appointment-system/`: core logic (slots, Messenger flow, entitlements, billing, auth)
- `src/components/appointment-system/`: UI components
- `appointment-system/`: migrations, email templates, and this guide

For business rules and design decisions, see `CLAUDE.md` at the repo root.

## 1. Environment variables

Put these in `.env.local` locally, and in the Vercel project settings for production:

```
# Supabase (dedicated Appointment System project; the BOOKLYPRO_ prefix is a legacy name, keep it)
NEXT_PUBLIC_BOOKLYPRO_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_BOOKLYPRO_SUPABASE_ANON_KEY=eyJ...
BOOKLYPRO_SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server-only, never NEXT_PUBLIC

# PayMongo billing
PAYMONGO_SECRET_KEY=sk_live_...
APPOINTMENTS_PAYMONGO_WEBHOOK_SECRET=whsk_...

# Meta / Messenger
META_APP_SECRET=xxxx
META_VERIFY_TOKEN=any-random-string-you-invent    # e.g. `openssl rand -hex 16`

# Owner "new booking" emails (Basic+), sent through Gmail
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx            # a Google App Password, not the account password
```

## 2. Create the dedicated Supabase project

1. In [supabase.com/dashboard](https://supabase.com/dashboard), click **New project** and name it `appointment-system`.
2. Open the **SQL Editor** and run every file in `appointment-system/migrations/` **in order, from 001 to 021**. There is no migration runner, so each new migration is also run by hand, before deploying the code that depends on it.
   - Migration 019 enables `pg_cron`, which schedules a keepalive ping every 12 hours so the free-tier project isn't paused. If `create extension pg_cron` fails, first enable it under **Database → Extensions**.
3. Copy the keys from **Settings → API** into the env vars above.
4. In **Authentication → URL Configuration**, add these redirect URLs:
   - `https://www.cyberussell.com/appointments/login` (signup confirmation)
   - `https://www.cyberussell.com/appointments/reset-password`
   - `https://www.cyberussell.com/appointments/staff/accept-invite` (staff invites)
5. In **Authentication → Providers → Email**, keep Email enabled with **Confirm email on**. The signup flow shows a "check your email" message, and the login page can resend the confirmation.
6. In **Authentication → Email Templates → Reset Password**, paste in `appointment-system/email-templates/reset-password.html`.

## 3. PayMongo billing

Billing uses PayMongo **Checkout Sessions** ("Pay Now") rather than PayMongo Subscriptions, because the Subscriptions API isn't enabled on the account. Each 30-day cycle is paid through its own checkout (card or GCash).

1. Copy the secret key from the PayMongo dashboard into `PAYMONGO_SECRET_KEY`.
2. Create a webhook with these settings:
   - URL: `https://www.cyberussell.com/appointments/api/paymongo/webhook`
   - Events: `checkout_session.payment.paid`
   - This is separate from any other webhook already on the shared PayMongo account.
3. Copy that webhook's signing secret into `APPOINTMENTS_PAYMONGO_WEBHOOK_SECRET`.

How billing behaves:

- New businesses start on **Free** with status **active**. There is no trial.
- When a payment succeeds, the webhook sets `plan_tier`, `plan_status = 'active'` and `plan_renews_at` (30 days from now). If the payment included the website add-on, it also sets `website_addon_expires_at` (365 days from now).
- If `plan_renews_at` passes without a new payment, the business is switched to `suspended` the next time its dashboard loads. There is no cron for this. Suspension turns off the public booking page, the public APIs and the Messenger bot.
- Owners can't change billing columns themselves; only the service role can (migration 011). For a manual fix, such as a comped plan or a refund, edit the `businesses` row in the Supabase table editor.
- **Website add-on fulfilment is manual.** A `website_addon_paid` event, or a `billing_payment_paid` event with `includes_addon: true`, means someone has to build the site.

## 4. Meta (Facebook) app for the Messenger bot (Pro plan)

1. In [developers.facebook.com](https://developers.facebook.com), go to **My Apps → Create App** and choose type **Business**.
2. Add the **Messenger** product to the app.
3. Copy the **App Secret** from **App settings → Basic** into `META_APP_SECRET`, and choose a value for `META_VERIFY_TOKEN`.
4. After deploying, set up the webhook in **Messenger → Settings → Webhooks**:
   - Callback URL: `https://www.cyberussell.com/appointments/api/messenger/webhook`
   - Verify token: the same value as `META_VERIFY_TOKEN`
   - Fields: `messages`, `messaging_postbacks`

### Connecting a business's Page (dev mode)

While the Meta app is in **Development Mode**, the bot works only for Pages whose admin is a tester on the app. For each business:

1. Under **App roles**, add the owner's Facebook account as a **Tester**. They must accept the invite.
2. In **Messenger → Settings → Access Tokens**, connect their Page and generate a **Page Access Token**.
3. Under Webhooks, **Add subscriptions** for that Page (`messages`, `messaging_postbacks`).
4. The owner pastes the **Facebook Page ID** and **Page Access Token** into the dashboard's **Settings** tab. The form only appears on the Pro plan. The token is stored in `business_secrets`, which only the service role can read.
5. Test by messaging the Page from a personal account. The bot should reply with its main menu (Book / Ask a question / Talk to staff).

Businesses below Pro still get one automatic reply, a link to their public booking page, once their Page is connected.

### App review (before going beyond testers)

To connect Pages you don't co-admin, submit the app for review with the `pages_messaging` permission. You'll need:

- a screencast of the full booking flow on a test Page
- a privacy policy URL (`https://www.cyberussell.com/privacy`)
- a clear usage description

Once the app is approved, the paste-a-token flow should be replaced with Facebook Login OAuth.

## 5. Operations

- **Health check:** `GET /appointments/api/health` returns 200 once Supabase is reachable, and 503 if it isn't. Point uptime monitors at it.
- **Errors and analytics:** everything is logged to the `events` table. Filter by `type = 'error'` (the `payload.source` field names where it failed), or by business activity such as `booking_created`, `booking_blocked_quota`, `handoff_to_human` and `billing_payment_paid`.
- **Keepalive:** the external cron (`cyberussell/supabase-keep-alive`) writes to `keepalive_heartbeat` with the anon key, and `pg_cron` pings the same row every 12 hours as a backup.
- **Staff logins:** owners invite staff by email from the **Staff** tab. Supabase sends the invite, which uses the default "Invite user" template.

## Architecture notes

- Double-booking is prevented at the **database level** by the `no_double_booking` exclusion constraint, not only in app code.
- The Messenger flow uses **buttons only**. The earlier Claude Haiku "AI receptionist" and its tier were removed (migration 009), so no Anthropic API key is needed.
- Every plan limit and feature gate is defined in `src/lib/appointment-system/entitlements.ts`.
- Absolute URLs (auth redirects, PayMongo return URLs, manage links) are hard-coded to `https://www.cyberussell.com/appointments/...`. If the app ever moves to its own domain, update them all together, along with `allowedOrigins` and `assetPrefix` in `next.config.ts`.
