import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Business, Conversation, ConversationState, Service, Slot } from './types'
import { getAvailableSlots, bookAppointment, formatSlotLabel, hasSameDayBooking, hasConfiguredHours } from './slots'
import { sendText, sendButtons, sendQuickReplies } from './messenger'
import { logEvent } from './events'
import { hasFeature, canCreateAppointment } from './entitlements'
import { sendNewBookingEmail } from './email'

// Flow: menu → choosing_service → choosing_slot → (known client? book)
//       → collecting_name → collecting_phone → book → confirmation.
// Buttons handle ~80% of traffic for free; Haiku catches free text.

interface Incoming {
  text?: string
  payload?: string // postback / quick reply payload
}

export async function handleIncoming(
  db: SupabaseClient,
  business: Business,
  pageToken: string,
  psid: string,
  incoming: Incoming
): Promise<void> {
  const convo = await getOrCreateConversation(db, business.id, psid)
  await logEvent(db, business.id, 'message_in', {
    psid,
    text: incoming.text ?? null,
    payload: incoming.payload ?? null,
  })

  // Business marked closed: tell the client and stop — no booking flow.
  const settings = business.settings as { closed?: boolean; closed_message?: string }
  if (settings.closed) {
    await sendText(
      pageToken,
      psid,
      settings.closed_message ||
        `Hi po! ${business.name} is temporarily closed. Message na lang po kami ulit kapag bukas na. 🙏`
    )
    return
  }

  if (!hasConfiguredHours(business)) {
    await sendText(
      pageToken,
      psid,
      `Hi po! ${business.name} hasn't set up online booking hours yet. Please message us again soon. 🙏`
    )
    return
  }

  // Interactive Messenger booking is a Pro+ feature. Lower plans still get a
  // useful reply: a link to their public booking page.
  if (!hasFeature(business, 'messenger_booking_bot')) {
    await sendText(
      pageToken,
      psid,
      `Hi po! 👋 To book with ${business.name}, please use our booking page:\n\nhttps://www.cyberussell.com/appointments/${business.slug}\n\nSalamat po!`
    )
    return
  }

  // Human mode: bot stays silent until staff hands back or 12h pass.
  if (convo.mode === 'human') {
    const idleMs = Date.now() - new Date(convo.last_message_at).getTime()
    if (incoming.payload !== 'BOT_RESUME' && idleMs < 12 * 3600_000) {
      await touchConversation(db, convo.id)
      return
    }
    await setMode(db, convo.id, 'bot')
  }

  if (incoming.payload) {
    await handlePayload(db, business, pageToken, psid, convo, incoming.payload)
  } else if (incoming.text) {
    await handleText(db, business, pageToken, psid, convo, incoming.text)
  }
}

// ── Payload (button/quick-reply) routing — zero AI cost ─────────────────────

async function handlePayload(
  db: SupabaseClient,
  business: Business,
  pageToken: string,
  psid: string,
  convo: Conversation,
  payload: string
): Promise<void> {
  if (payload === 'GET_STARTED' || payload === 'MAIN_MENU') {
    return showMainMenu(db, business, pageToken, psid, convo)
  }
  if (payload === 'BOOK') {
    return showServices(db, business, pageToken, psid, convo)
  }
  if (payload === 'TALK_HUMAN') {
    return handoffToHuman(db, business, pageToken, psid, convo)
  }
  if (payload === 'ASK') {
    await setState(db, convo.id, { step: 'idle' })
    await sendText(pageToken, psid, 'Sige po! Type your question — price, location, schedule, anything. 😊')
    return
  }
  if (payload.startsWith('SERVICE_')) {
    const serviceId = payload.slice('SERVICE_'.length)
    return showSlots(db, business, pageToken, psid, convo, serviceId)
  }
  if (payload.startsWith('TIME_')) {
    const startsAt = new Date(Number(payload.slice('TIME_'.length))).toISOString()
    return onTimeChosen(db, business, pageToken, psid, convo, startsAt)
  }
  if (payload.startsWith('STAFF_')) {
    // STAFF_{staffId}_{epochMs}
    const rest = payload.slice('STAFF_'.length)
    const sep = rest.indexOf('_')
    const staffId = rest.slice(0, sep)
    const startsAt = new Date(Number(rest.slice(sep + 1))).toISOString()
    return onSlotChosen(db, business, pageToken, psid, convo, staffId, startsAt)
  }
  // Unknown payload → menu
  return showMainMenu(db, business, pageToken, psid, convo)
}

// ── Free-text routing ────────────────────────────────────────────────────────

async function handleText(
  db: SupabaseClient,
  business: Business,
  pageToken: string,
  psid: string,
  convo: Conversation,
  text: string
): Promise<void> {
  const state = convo.state

  if (state.step === 'collecting_name') {
    const name = text.trim().slice(0, 80)
    if (name.length < 2) {
      await sendText(pageToken, psid, 'Pakitype po ang buong pangalan ninyo. 🙂')
      return
    }
    await setState(db, convo.id, { ...state, step: 'collecting_phone', clientName: name })
    await sendText(pageToken, psid, `Thanks, ${name}! Ano po ang mobile number ninyo? (e.g. 09171234567)`)
    return
  }

  if (state.step === 'collecting_phone') {
    const phone = text.replace(/[^\d+]/g, '')
    if (phone.length < 10) {
      await sendText(pageToken, psid, 'Mukhang kulang po ang number — pakitype ulit (e.g. 09171234567).')
      return
    }
    return finalizeBooking(db, business, pageToken, psid, convo, {
      ...state,
      clientPhone: phone,
    } as ConversationState & { clientName?: string; clientPhone?: string })
  }

  // No free-text understanding — everything else falls back to the button menu.
  return showMainMenu(db, business, pageToken, psid, convo)
}

// ── Flow steps ───────────────────────────────────────────────────────────────

async function showMainMenu(
  db: SupabaseClient,
  business: Business,
  pageToken: string,
  psid: string,
  convo: Conversation
): Promise<void> {
  await setState(db, convo.id, { step: 'idle', intakeNote: convo.state.intakeNote })
  await sendButtons(pageToken, psid, `Hi! 👋 Welcome to ${business.name}. Paano po kami makakatulong?`, [
    { title: '📅 Book appointment', payload: 'BOOK' },
    { title: '❓ Ask a question', payload: 'ASK' },
    { title: '💬 Talk to staff', payload: 'TALK_HUMAN' },
  ])
}

async function showServices(
  db: SupabaseClient,
  business: Business,
  pageToken: string,
  psid: string,
  convo: Conversation
): Promise<void> {
  const services = await getActiveServices(db, business.id)
  if (services.length === 0) {
    await sendText(pageToken, psid, 'Wala pa pong naka-setup na services. Message na lang po kayo ulit mamaya!')
    return
  }
  await setState(db, convo.id, { ...convo.state, step: 'choosing_service' })
  await sendQuickReplies(
    pageToken,
    psid,
    'Anong service po ang kailangan ninyo?',
    services.slice(0, 12).map((s) => ({
      title: `${s.name} ₱${Number(s.price).toFixed(0)}`.slice(0, 20),
      payload: `SERVICE_${s.id}`,
    }))
  )
}

async function showSlots(
  db: SupabaseClient,
  business: Business,
  pageToken: string,
  psid: string,
  convo: Conversation,
  serviceId: string
): Promise<void> {
  // Fetch more than we'll display so that duplicate times across multiple
  // staff still leave enough distinct times to fill the quick-reply list.
  const slots = await getAvailableSlots(db, {
    businessId: business.id,
    timezone: business.timezone,
    serviceId,
    days: 7,
    limit: 24,
  })
  if (slots.length === 0) {
    await sendText(pageToken, psid, 'Pasensya na po, fully booked kami this week. 😔')
    await sendButtons(pageToken, psid, 'Gusto niyo po bang makausap ang staff namin?', [
      { title: '💬 Talk to staff', payload: 'TALK_HUMAN' },
      { title: '🔙 Main menu', payload: 'MAIN_MENU' },
    ])
    return
  }
  await setState(db, convo.id, { ...convo.state, step: 'choosing_slot', serviceId })

  // De-dupe by start time — staff is chosen as a separate optional step,
  // only when more than one staff member is free at the chosen time.
  const uniqueTimes: Slot[] = []
  const seen = new Set<string>()
  for (const s of slots) {
    if (seen.has(s.startsAt)) continue
    seen.add(s.startsAt)
    uniqueTimes.push(s)
  }

  await sendQuickReplies(
    pageToken,
    psid,
    'Eto po ang mga available na schedule — pili lang po: 🗓️',
    uniqueTimes.map((s) => ({
      title: s.label.slice(0, 20),
      payload: `TIME_${new Date(s.startsAt).getTime()}`,
    }))
  )
}

async function onTimeChosen(
  db: SupabaseClient,
  business: Business,
  pageToken: string,
  psid: string,
  convo: Conversation,
  startsAt: string
): Promise<void> {
  const serviceId = convo.state.serviceId
  if (!serviceId) return showServices(db, business, pageToken, psid, convo)

  const slots = await getAvailableSlots(db, {
    businessId: business.id,
    timezone: business.timezone,
    serviceId,
    days: 7,
    limit: 100,
  })
  const candidates = slots.filter((s) => s.startsAt === startsAt)

  if (candidates.length === 0) {
    await sendText(pageToken, psid, 'Ay, kakakuha lang po ng slot na iyon. 😅 Eto po ang iba pang available:')
    return showSlots(db, business, pageToken, psid, convo, serviceId)
  }

  // Only one staff member free at that time — no need to ask, book straight through.
  if (candidates.length === 1) {
    return onSlotChosen(db, business, pageToken, psid, convo, candidates[0].staffId, startsAt)
  }

  // Optional staff choice: more than one staff member is free at this time.
  await setState(db, convo.id, { ...convo.state, step: 'choosing_staff', slotStart: startsAt })
  await sendQuickReplies(
    pageToken,
    psid,
    'Sino po ang gusto ninyong puntahan?',
    candidates.map((s: Slot) => ({
      title: s.staffName.slice(0, 20),
      payload: `STAFF_${s.staffId}_${new Date(startsAt).getTime()}`,
    }))
  )
}

async function onSlotChosen(
  db: SupabaseClient,
  business: Business,
  pageToken: string,
  psid: string,
  convo: Conversation,
  staffId: string,
  startsAt: string
): Promise<void> {
  const state: ConversationState = { ...convo.state, slotStart: startsAt, slotStaffId: staffId }

  // Returning clients are recognized by PSID — no re-typing details.
  const { data: client } = await db
    .from('clients')
    .select('id, full_name, phone')
    .eq('business_id', business.id)
    .eq('messenger_psid', psid)
    .maybeSingle()

  if (client?.full_name && client.phone) {
    return finalizeBooking(db, business, pageToken, psid, convo, {
      ...state,
      clientName: client.full_name,
      clientPhone: client.phone,
    } as ConversationState)
  }

  await setState(db, convo.id, { ...state, step: 'collecting_name' })
  await sendText(pageToken, psid, 'Almost done! 🙌 Ano po ang buong pangalan ninyo?')
}

async function finalizeBooking(
  db: SupabaseClient,
  business: Business,
  pageToken: string,
  psid: string,
  convo: Conversation,
  state: ConversationState & { clientName?: string; clientPhone?: string }
): Promise<void> {
  if (!state.serviceId || !state.slotStart || !state.slotStaffId) {
    await setState(db, convo.id, { step: 'idle' })
    return showServices(db, business, pageToken, psid, convo)
  }

  const quota = await canCreateAppointment(db, business)
  if (!quota.allowed) {
    await logEvent(db, business.id, 'booking_blocked_quota', { psid, used: quota.used, limit: quota.limit })
    return handoffToHuman(
      db,
      business,
      pageToken,
      psid,
      convo,
      'Paki-antay po sandali — ipapasa ko kayo sa staff namin para ma-ayos ang booking ninyo. 🙏'
    )
  }

  const sameDay = await hasSameDayBooking(db, business.id, business.timezone, state.slotStart, { messengerPsid: psid })
  if (sameDay) {
    await setState(db, convo.id, { step: 'idle' })
    await sendText(
      pageToken,
      psid,
      'May existing appointment na po kayo sa araw na iyon. Pumili po ng ibang araw, o i-tap ang "Talk to staff" kung kailangan niyo ng dagdag na booking. 🙏'
    )
    return
  }

  const result = await bookAppointment(db, {
    businessId: business.id,
    serviceId: state.serviceId,
    staffId: state.slotStaffId,
    startsAt: state.slotStart,
    client: {
      fullName: state.clientName ?? '',
      phone: state.clientPhone ?? '',
      messengerPsid: psid,
    },
    source: 'messenger',
    intakeNote: state.intakeNote,
  })

  if (!result.ok) {
    if (result.reason === 'conflict') {
      await sendText(pageToken, psid, 'Ay, kakakuha lang po ng slot na iyon. 😅 Eto po ang iba pang available:')
      return showSlots(db, business, pageToken, psid, convo, state.serviceId)
    }
    await logEvent(db, business.id, 'booking_failed', { psid, message: result.message })
    await sendText(pageToken, psid, 'May problema po sa booking. Pakisubukan ulit, o i-tap ang "Talk to staff".')
    return
  }

  const [{ data: service }, { data: staff }] = await Promise.all([
    db.from('services').select('name').eq('id', state.serviceId).single(),
    db.from('staff').select('name').eq('id', state.slotStaffId).single(),
  ])
  const label = formatSlotLabel(state.slotStart, business.timezone)
  await setState(db, convo.id, { step: 'idle' })
  await logEvent(db, business.id, 'booking_created', {
    psid,
    appointment_id: result.appointmentId,
    source: 'messenger',
  })
  await sendNewBookingEmail(db, business, {
    clientName: state.clientName ?? '',
    clientPhone: state.clientPhone ?? '',
    serviceName: service?.name ?? 'Service',
    staffName: staff?.name ?? 'Staff',
    timeLabel: label,
    source: 'messenger',
  })
  // Same info hierarchy as the dashboard/manage views: date & time first, then
  // who's booked, how to reach them, what for, and with whom.
  await sendText(
    pageToken,
    psid,
    `Booked na po! ✅\n\n🗓️ ${label}\n🙋 ${state.clientName}\n📞 ${state.clientPhone}\n💼 ${service?.name ?? 'Appointment'}\n🧑‍⚕️ with ${staff?.name ?? 'our staff'}\n📍 ${business.name}${business.address ? `, ${business.address}` : ''}\n\nSee you po! Magre-remind kami bago ang schedule ninyo.\n\nReference code: ${result.referenceCode}\nPara mag-cancel o mag-reschedule: https://www.cyberussell.com/appointments/manage/${result.referenceCode}`
  )
}

async function handoffToHuman(
  db: SupabaseClient,
  business: Business,
  pageToken: string,
  psid: string,
  convo: Conversation,
  customMessage?: string
): Promise<void> {
  await setMode(db, convo.id, 'human')
  await logEvent(db, business.id, 'handoff_to_human', { psid })
  await sendText(
    pageToken,
    psid,
    customMessage ??
      'Sige po! Ipapasa ko kayo sa staff namin — reply po sila dito sa chat na ito as soon as possible. 🙏'
  )
}

// ── Small helpers ────────────────────────────────────────────────────────────

async function getOrCreateConversation(db: SupabaseClient, businessId: string, psid: string): Promise<Conversation> {
  const { data } = await db
    .from('conversations')
    .select('*')
    .eq('business_id', businessId)
    .eq('psid', psid)
    .maybeSingle()
  if (data) return data as Conversation
  const { data: created, error } = await db
    .from('conversations')
    .insert({ business_id: businessId, psid })
    .select('*')
    .single()
  if (error || !created) throw new Error(`conversation insert failed: ${error?.message}`)
  return created as Conversation
}

async function setState(db: SupabaseClient, convoId: string, state: ConversationState) {
  await db
    .from('conversations')
    .update({ state, last_message_at: new Date().toISOString() })
    .eq('id', convoId)
}

async function setMode(db: SupabaseClient, convoId: string, mode: 'bot' | 'human') {
  await db
    .from('conversations')
    .update({ mode, last_message_at: new Date().toISOString() })
    .eq('id', convoId)
}

async function touchConversation(db: SupabaseClient, convoId: string) {
  await db.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convoId)
}

async function getActiveServices(db: SupabaseClient, businessId: string): Promise<Service[]> {
  const { data } = await db
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('created_at')
  return (data ?? []) as Service[]
}
