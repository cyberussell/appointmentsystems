import 'server-only'
import crypto from 'node:crypto'

const GRAPH_URL = 'https://graph.facebook.com/v21.0/me/messages'

// Verify X-Hub-Signature-256 so only Meta can hit the webhook.
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret || !signatureHeader?.startsWith('sha256=')) return false
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
  const received = signatureHeader.slice('sha256='.length)
  if (expected.length !== received.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
}

export interface QuickReply {
  title: string // max 20 chars
  payload: string
}

export interface PostbackButton {
  title: string // max 20 chars
  payload: string
}

type MessengerMessage =
  | { text: string }
  | { text: string; quick_replies: { content_type: 'text'; title: string; payload: string }[] }
  | {
      attachment: {
        type: 'template'
        payload: { template_type: 'button'; text: string; buttons: { type: 'postback'; title: string; payload: string }[] }
      }
    }

async function callSendApi(
  pageToken: string,
  psid: string,
  message: MessengerMessage,
  tag?: 'CONFIRMED_EVENT_UPDATE'
): Promise<boolean> {
  const body: Record<string, unknown> = {
    recipient: { id: psid },
    messaging_type: tag ? 'MESSAGE_TAG' : 'RESPONSE',
    message,
  }
  if (tag) body.tag = tag

  const res = await fetch(`${GRAPH_URL}?access_token=${encodeURIComponent(pageToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error('[appointment-system] Messenger send failed', res.status, await res.text())
    return false
  }
  return true
}

export function sendText(pageToken: string, psid: string, text: string, tag?: 'CONFIRMED_EVENT_UPDATE') {
  return callSendApi(pageToken, psid, { text }, tag)
}

export function sendQuickReplies(pageToken: string, psid: string, text: string, replies: QuickReply[]) {
  return callSendApi(pageToken, psid, {
    text,
    quick_replies: replies.slice(0, 13).map((r) => ({
      content_type: 'text' as const,
      title: r.title.slice(0, 20),
      payload: r.payload,
    })),
  })
}

// Button template supports max 3 buttons; chunk if more are needed.
export async function sendButtons(pageToken: string, psid: string, text: string, buttons: PostbackButton[]) {
  const chunks: PostbackButton[][] = []
  for (let i = 0; i < buttons.length; i += 3) chunks.push(buttons.slice(i, i + 3))
  let ok = true
  for (let i = 0; i < chunks.length; i++) {
    ok =
      (await callSendApi(pageToken, psid, {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: i === 0 ? text : '…',
            buttons: chunks[i].map((b) => ({
              type: 'postback' as const,
              title: b.title.slice(0, 20),
              payload: b.payload,
            })),
          },
        },
      })) && ok
  }
  return ok
}
