import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/appointment-system/supabase-server'
import { verifyMetaSignature } from '@/lib/appointment-system/messenger'
import { handleIncoming } from '@/lib/appointment-system/flow'
import { logError } from '@/lib/appointment-system/errors'
import type { Business } from '@/lib/appointment-system/types'

export const dynamic = 'force-dynamic'

// Meta webhook verification handshake (set the same token in the Meta app).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  if (
    params.get('hub.mode') === 'subscribe' &&
    params.get('hub.verify_token') === process.env.META_VERIFY_TOKEN &&
    params.get('hub.challenge')
  ) {
    return new NextResponse(params.get('hub.challenge'), { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

interface MessagingEvent {
  sender?: { id: string }
  message?: { text?: string; quick_reply?: { payload?: string }; is_echo?: boolean }
  postback?: { payload?: string }
}

interface WebhookEntry {
  id: string // page id
  messaging?: MessagingEvent[]
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  if (!verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  let body: { object?: string; entry?: WebhookEntry[] }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new NextResponse('Bad payload', { status: 400 })
  }
  if (body.object !== 'page' || !Array.isArray(body.entry)) {
    return new NextResponse('Ignored', { status: 200 })
  }

  const db = createAdminSupabase()

  for (const entry of body.entry) {
    try {
      // Route by page id → business tenant.
      const { data: business } = await db
        .from('businesses')
        .select('*')
        .eq('fb_page_id', entry.id)
        .maybeSingle()
      if (!business) continue

      // Suspended businesses stop getting bot replies (manual billing enforcement).
      if ((business as Business).plan_status === 'suspended') continue

      const { data: secret } = await db
        .from('business_secrets')
        .select('fb_page_token')
        .eq('business_id', business.id)
        .maybeSingle()
      const pageToken = secret?.fb_page_token
      if (!pageToken) continue

      for (const event of entry.messaging ?? []) {
        const psid = event.sender?.id
        if (!psid || event.message?.is_echo) continue

        const payload = event.postback?.payload ?? event.message?.quick_reply?.payload
        const text = event.message?.text

        if (!payload && !text) continue
        try {
          await handleIncoming(db, business as Business, pageToken, psid, { payload, text })
        } catch (err) {
          console.error('[appointment-system] webhook handling failed', err)
          await logError(db, business.id, 'messenger_webhook_handle_incoming', err)
        }
      }
    } catch (err) {
      // A failure resolving the tenant (business/secret lookup) shouldn't
      // crash the whole batch or skip Meta's required 200 — log and move on.
      console.error('[appointment-system] webhook entry routing failed', err)
      await logError(db, null, 'messenger_webhook_routing', err)
    }
  }

  // Always 200 so Meta doesn't retry-storm the endpoint.
  return new NextResponse('EVENT_RECEIVED', { status: 200 })
}
