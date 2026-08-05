import 'server-only'
import crypto from 'crypto'
import type { PlanTier } from './types'

const PAYMONGO_API = 'https://api.paymongo.com/v1'

function authHeader(): string {
  const secret = process.env.PAYMONGO_SECRET_KEY
  if (!secret) throw new Error('PAYMONGO_SECRET_KEY is not set')
  return 'Basic ' + Buffer.from(`${secret}:`).toString('base64')
}

interface CheckoutSessionResponse {
  data: {
    id: string
    attributes: {
      checkout_url: string
    }
  }
}

/** Creates a hosted PayMongo checkout for one billing cycle of a plan tier. */
export async function createBillingCheckout(opts: {
  businessId: string
  businessName: string
  tier: PlanTier
  planName: string
  featuresSummary: string
  amountCentavos: number
  successUrl: string
  cancelUrl: string
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const res = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          line_items: [
            {
              currency: 'PHP',
              amount: opts.amountCentavos,
              description: opts.featuresSummary,
              name: `${opts.planName} plan`,
              quantity: 1,
            },
          ],
          payment_method_types: ['card', 'gcash'],
          description: `Appointment System billing — ${opts.businessName}`,
          success_url: opts.successUrl,
          cancel_url: opts.cancelUrl,
          metadata: { business_id: opts.businessId, tier: opts.tier },
        },
      },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`PayMongo checkout session failed: ${res.status} ${body}`)
  }
  const json = (await res.json()) as CheckoutSessionResponse
  return { checkoutUrl: json.data.attributes.checkout_url, sessionId: json.data.id }
}

/**
 * Verifies the `Paymongo-Signature` header: `t=<unix ts>,te=<test hmac>,li=<live hmac>`.
 * HMAC-SHA256 is computed over `${t}.${rawBody}` using the webhook's signing secret.
 */
export function verifyPaymongoSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const [k, v] = p.split('=')
      return [k, v]
    })
  )
  const timestamp = parts.t
  if (!timestamp) return false

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  const expectedBuf = Buffer.from(expected)

  // Accept a match against either the test or live signature field — we only
  // have one webhook secret configured, so an exact HMAC match against it is
  // what matters, not which field name PayMongo happened to populate.
  for (const candidate of [parts.te, parts.li]) {
    if (!candidate) continue
    const candidateBuf = Buffer.from(candidate)
    if (expectedBuf.length === candidateBuf.length && crypto.timingSafeEqual(expectedBuf, candidateBuf)) {
      return true
    }
  }
  return false
}
