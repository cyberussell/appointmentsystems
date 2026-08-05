# Appointment System Setup Guide

Appointment System is the subscription booking system for clinics, spas, salons, law offices, and vet clinics at `/appointments`. It runs on its
**own Supabase project** (separate from the main site's) so it can be extracted into a
standalone SaaS later. All code lives in three scoped places:

- `src/app/appointments/` — routes (landing, auth, dashboard, public booking, webhook)
- `src/lib/appointment-system/` — core logic (slots, Messenger, AI, auth)
- `src/components/appointment-system/` — UI components
- `appointment-system/` — migrations + this guide

## 1. Create the dedicated Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project** → name it `appointment-system`.
2. Open **SQL Editor** and run every file in `appointment-system/migrations/` in order (001 → 004).
3. In **Authentication → Providers → Email**: keep Email enabled.
   - *Recommended for the trial phase:* turn **off** "Confirm email" so clinic signups land in
     the dashboard immediately. Turn it back on before public launch.
4. Copy the keys from **Settings → API** into `.env.local`:

```
NEXT_PUBLIC_BOOKLYPRO_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_BOOKLYPRO_SUPABASE_ANON_KEY=eyJ...
BOOKLYPRO_SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only, never NEXT_PUBLIC
```

`ANTHROPIC_API_KEY` (already used by other site features) also powers the AI receptionist.

## 2. Create the Meta (Facebook) app

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App**
   → type **Business**.
2. Add the **Messenger** product to the app.
3. In **App settings → Basic**, copy the **App Secret** into `.env.local`:

```
META_APP_SECRET=xxxx
META_VERIFY_TOKEN=any-random-string-you-invent   # e.g. output of `openssl rand -hex 16`
```

4. Deploy the site (the webhook must be publicly reachable), then in
   **Messenger → Settings → Webhooks**:
   - Callback URL: `https://www.cyberussell.com/appointments/api/messenger/webhook`
   - Verify token: the same `META_VERIFY_TOKEN` value
   - Subscribe to fields: `messages`, `messaging_postbacks`

## 3. Connect a business's Page (dev mode — first 3–5 businesses)

While the Meta app is in **Development Mode**, it works fully for any Page whose admin is a
tester on the app. Per pilot clinic:

1. **App roles**: add the clinic owner's Facebook account as a **Tester** (they accept the invite).
2. **Messenger → Settings → Access Tokens**: connect their Page, generate a **Page Access Token**.
3. In the same panel, under Webhooks, **Add subscriptions** for that Page (`messages`,
   `messaging_postbacks`).
4. In the Appointment System dashboard (**Settings** tab), paste the **Page ID** and **Page Access Token**.
5. Message the Page from a personal account — the bot should reply with the main menu.

## 4. App review (before scaling past testers)

To connect Pages you don't co-admin, submit the app for review requesting `pages_messaging`.
You'll need: a screencast of the full booking flow on a test Page, a privacy policy URL
(cyberussell.com/privacy), and clear usage description. Expect days to a few weeks.
After approval, replace the paste-a-token flow with proper Facebook Login OAuth.

## 5. Manual billing (v1)

There is no PayMongo integration yet — by design:

- New businesses start on a 14-day `trial`.
- After they pay (GCash/bank transfer), set `plan_status = 'active'` and the right `plan_tier`
  directly in the Supabase table editor (`businesses` table).
- Setting `plan_status = 'suspended'` pauses their Messenger bot and public booking page.

## 6. AI cost tracking

Every Haiku call is logged in the `events` table as `ai_call` with token usage per clinic.
To see a clinic's monthly AI spend, filter `events` by `clinic_id`, `type = 'ai_call'` and sum
`payload->usage`. Bookings, handoffs, and no-shows are also logged — this is the data source
for Phase 2 features (no-show prediction, recall campaigns).

## Architecture notes for future extraction

- Everything uses the `BOOKLYPRO_*` env vars and the dedicated Supabase project — extraction is:
  copy the three scoped folders into a fresh Next.js repo, point a new domain at it, done.
- The Messenger flow is buttons-first: ~80% of conversations never touch the AI. Haiku
  (`claude-haiku-4-5`) handles free text only, with per-clinic context prompt-cached.
- Double-booking is prevented at the database level (exclusion constraint), not just in app code.
