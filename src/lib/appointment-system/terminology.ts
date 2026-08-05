import type { BusinessType } from './types'

// Display vocabulary per business type. DB tables keep their original names
// (clinics/patients) — only user-facing words change.
export interface Terminology {
  /** e.g. "clinic", "spa", "law office" */
  business: string
  /** e.g. "patient", "client" */
  client: string
  clients: string
  Client: string
  Clients: string
  /** e.g. "doctor", "attorney", "stylist" */
  provider: string
}

const TERMS: Record<BusinessType, Terminology> = {
  medical: { business: 'clinic', client: 'patient', clients: 'patients', Client: 'Patient', Clients: 'Patients', provider: 'doctor' },
  dental: { business: 'clinic', client: 'patient', clients: 'patients', Client: 'Patient', Clients: 'Patients', provider: 'dentist' },
  spa: { business: 'spa', client: 'client', clients: 'clients', Client: 'Client', Clients: 'Clients', provider: 'therapist' },
  salon: { business: 'salon', client: 'client', clients: 'clients', Client: 'Client', Clients: 'Clients', provider: 'stylist' },
  law: { business: 'law office', client: 'client', clients: 'clients', Client: 'Client', Clients: 'Clients', provider: 'lawyer' },
  veterinary: { business: 'vet clinic', client: 'pet owner', clients: 'pet owners', Client: 'Pet owner', Clients: 'Pet owners', provider: 'veterinarian' },
  other: { business: 'business', client: 'client', clients: 'clients', Client: 'Client', Clients: 'Clients', provider: 'staff member' },
}

export const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: 'medical', label: 'Medical clinic' },
  { value: 'dental', label: 'Dental clinic' },
  { value: 'spa', label: 'Spa' },
  { value: 'salon', label: 'Salon' },
  { value: 'law', label: 'Law office' },
  { value: 'veterinary', label: 'Veterinary clinic' },
  { value: 'other', label: 'Other' },
]

export function getTerms(types: BusinessType[] | null | undefined): Terminology {
  const primary = types?.[0] ?? 'medical'
  return TERMS[primary] ?? TERMS.medical
}
