import 'server-only'
import nodemailer from 'nodemailer'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Business } from './types'
import { hasFeature } from './entitlements'
import { logError } from './errors'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function transporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

/**
 * Notifies the owner by email that a new self-service (web or Messenger)
 * booking came in. Basic+ feature — gated here, not at call sites, so it
 * can't be forgotten when a new call site is added. Never throws: a
 * notification failure should never break a real booking.
 */
export async function sendNewBookingEmail(
  db: SupabaseClient,
  business: Pick<Business, 'id' | 'name' | 'owner_id' | 'plan_tier'>,
  details: {
    clientName: string
    clientPhone: string
    serviceName: string
    staffName: string
    timeLabel: string
    source: 'web' | 'messenger'
  }
): Promise<void> {
  if (!hasFeature(business, 'email_notifications')) return
  try {
    const { data } = await db.auth.admin.getUserById(business.owner_id)
    const ownerEmail = data.user?.email
    if (!ownerEmail) return

    const name = escapeHtml(details.clientName || 'Unknown')
    const phone = escapeHtml(details.clientPhone || '—')
    const service = escapeHtml(details.serviceName)
    const staff = escapeHtml(details.staffName)
    const time = escapeHtml(details.timeLabel)
    const businessName = escapeHtml(business.name)

    await transporter().sendMail({
      from: `"${businessName} · Appointment System" <${process.env.GMAIL_USER}>`,
      to: ownerEmail,
      subject: `New booking — ${name} · ${time}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #10B981;">New appointment booked</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; font-weight: bold; width: 100px;">Client</td><td style="padding: 6px 0;">${name}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">Phone</td><td style="padding: 6px 0;">${phone}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">Service</td><td style="padding: 6px 0;">${service}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">With</td><td style="padding: 6px 0;">${staff}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">When</td><td style="padding: 6px 0;">${time}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: bold;">Booked via</td><td style="padding: 6px 0;">${details.source === 'messenger' ? 'Messenger' : 'Booking page'}</td></tr>
          </table>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">${businessName} · Appointment System</p>
        </div>
      `,
    })
  } catch (error) {
    console.error('New booking email failed:', error)
    await logError(db, business.id, 'sendNewBookingEmail', error)
  }
}
