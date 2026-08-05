export type PlanTier = 'free' | 'basic' | 'pro'
export type PlanStatus = 'trial' | 'active' | 'suspended'
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type AppointmentSource = 'messenger' | 'web' | 'manual'
export type BusinessType = 'medical' | 'dental' | 'spa' | 'salon' | 'law' | 'veterinary' | 'other'

/** Business-wide open/close hours per weekday, index 0 = Sunday .. 6 = Saturday. null = closed that day. */
export type BusinessHours = ({ open: string; close: string } | null)[]
export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export interface Business {
  id: string
  owner_id: string
  name: string
  slug: string
  phone: string
  address: string
  timezone: string
  business_types: BusinessType[]
  plan_tier: PlanTier
  plan_status: PlanStatus
  trial_ends_at: string
  paymongo_checkout_session_id: string | null
  plan_renews_at: string | null
  selected_plan_tier: PlanTier | null
  first_login_at: string | null
  fb_page_id: string | null
  settings: Record<string, unknown>
  created_at: string
}

export interface Staff {
  id: string
  business_id: string
  name: string
  title: string
  active: boolean
  created_at: string
  profile_id: string | null
  invite_email: string | null
  invited_at: string | null
}

export interface Service {
  id: string
  business_id: string
  name: string
  duration_min: number
  price: number
  active: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export interface Availability {
  id: string
  business_id: string
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

export interface AvailabilityBreak {
  id: string
  business_id: string
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

export interface BlockedDate {
  id: string
  business_id: string
  staff_id: string | null // null = whole business closed
  date: string // "YYYY-MM-DD"
  reason: string
  created_at: string
}

export interface Client {
  id: string
  business_id: string
  full_name: string
  phone: string
  messenger_psid: string | null
  notes: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface Appointment {
  id: string
  business_id: string
  client_id: string
  staff_id: string
  service_id: string
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  source: AppointmentSource
  intake_note: string
  amount_paid: number
  paid_at: string | null
  reference_code: string | null
  created_at: string
}

export type FlowStep =
  | 'idle'
  | 'choosing_service'
  | 'choosing_slot'
  | 'choosing_staff'
  | 'collecting_name'
  | 'collecting_phone'

export interface ConversationState {
  step: FlowStep
  serviceId?: string
  slotStart?: string
  slotStaffId?: string
  intakeNote?: string
  [key: string]: unknown
}

export interface Conversation {
  id: string
  business_id: string
  psid: string
  state: ConversationState
  mode: 'bot' | 'human'
  last_message_at: string
}

export interface Slot {
  startsAt: string // ISO
  endsAt: string // ISO
  staffId: string
  staffName: string
  label: string // human label in business timezone, e.g. "Tue Jul 7, 2:00 PM"
}
