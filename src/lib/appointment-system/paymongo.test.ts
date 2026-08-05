import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { verifyPaymongoSignature } from './paymongo'

const secret = 'test_webhook_secret'

function sign(body: string, timestamp: number, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(`${timestamp}.${body}`).digest('hex')
}

describe('verifyPaymongoSignature', () => {
  it('accepts a validly signed test-mode payload', () => {
    const body = JSON.stringify({ hello: 'world' })
    const t = Math.floor(Date.now() / 1000)
    const header = `t=${t},te=${sign(body, t, secret)},li=deadbeef`
    expect(verifyPaymongoSignature(body, header, secret)).toBe(true)
  })

  it('accepts a validly signed live-mode payload', () => {
    const body = JSON.stringify({ hello: 'world' })
    const t = Math.floor(Date.now() / 1000)
    const header = `t=${t},te=deadbeef,li=${sign(body, t, secret)}`
    expect(verifyPaymongoSignature(body, header, secret)).toBe(true)
  })

  it('rejects a payload signed with the wrong secret', () => {
    const body = JSON.stringify({ hello: 'world' })
    const t = Math.floor(Date.now() / 1000)
    const header = `t=${t},te=${sign(body, t, 'wrong_secret')}`
    expect(verifyPaymongoSignature(body, header, secret)).toBe(false)
  })

  it('rejects a tampered body against a signature computed for the original body', () => {
    const original = JSON.stringify({ hello: 'world' })
    const tampered = JSON.stringify({ hello: 'world', tier: 'pro' })
    const t = Math.floor(Date.now() / 1000)
    const header = `t=${t},te=${sign(original, t, secret)}`
    expect(verifyPaymongoSignature(tampered, header, secret)).toBe(false)
  })

  it('rejects a missing signature header', () => {
    expect(verifyPaymongoSignature('{}', null, secret)).toBe(false)
  })

  it('rejects a malformed signature header with no timestamp', () => {
    expect(verifyPaymongoSignature('{}', 'te=deadbeef', secret)).toBe(false)
  })
})
