'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireBusiness } from '@/lib/appointment-system/auth'

const availabilityWindowSchema = z
  .object({
    staff_id: z.string().uuid(),
    day_of_week: z.coerce.number().int().min(0).max(6),
    start_time: z.string().min(1),
    end_time: z.string().min(1),
  })
  .refine((v) => v.start_time < v.end_time, { message: 'Start time must be before end time.' })

export async function addAvailability(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness()
  const parsed = availabilityWindowSchema.safeParse({
    staff_id: formData.get('staff_id'),
    day_of_week: formData.get('day_of_week'),
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
  })
  if (!parsed.success) return
  const { staff_id: staffId, day_of_week: day, start_time: start, end_time: end } = parsed.data
  await supabase.from('availability').insert({
    business_id: business.id,
    staff_id: staffId,
    day_of_week: day,
    start_time: start,
    end_time: end,
  })
  revalidatePath('/appointments/dashboard/availability')
}

export async function deleteAvailability(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness()
  await supabase
    .from('availability')
    .delete()
    .eq('id', String(formData.get('id')))
    .eq('business_id', business.id)
  revalidatePath('/appointments/dashboard/availability')
}

export async function addAvailabilityBreak(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness()
  const parsed = availabilityWindowSchema.safeParse({
    staff_id: formData.get('staff_id'),
    day_of_week: formData.get('day_of_week'),
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
  })
  if (!parsed.success) return
  const { staff_id: staffId, day_of_week: day, start_time: start, end_time: end } = parsed.data
  await supabase.from('availability_breaks').insert({
    business_id: business.id,
    staff_id: staffId,
    day_of_week: day,
    start_time: start,
    end_time: end,
  })
  revalidatePath('/appointments/dashboard/availability')
}

export async function deleteAvailabilityBreak(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness()
  await supabase
    .from('availability_breaks')
    .delete()
    .eq('id', String(formData.get('id')))
    .eq('business_id', business.id)
  revalidatePath('/appointments/dashboard/availability')
}

const addBlockedDateSchema = z.object({
  staff_id: z.string().trim().catch(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z
    .string()
    .catch('')
    .transform((v) => v.trim().slice(0, 200)),
})

export async function addBlockedDate(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness()
  const parsed = addBlockedDateSchema.safeParse({
    staff_id: formData.get('staff_id'),
    date: formData.get('date'),
    reason: formData.get('reason'),
  })
  if (!parsed.success) return
  const { staff_id: staffId, date, reason } = parsed.data
  await supabase.from('blocked_dates').insert({
    business_id: business.id,
    staff_id: staffId || null,
    date,
    reason,
  })
  revalidatePath('/appointments/dashboard/availability')
}

export async function deleteBlockedDate(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness()
  await supabase
    .from('blocked_dates')
    .delete()
    .eq('id', String(formData.get('id')))
    .eq('business_id', business.id)
  revalidatePath('/appointments/dashboard/availability')
}
