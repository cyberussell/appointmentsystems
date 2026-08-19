'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireBusiness } from '@/lib/appointment-system/auth'

const setStaffServicesSchema = z.object({
  staff_id: z.string().uuid(),
  service_ids: z.array(z.string().uuid()),
})

export async function setStaffServices(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness()
  const parsed = setStaffServicesSchema.safeParse({
    staff_id: formData.get('staff_id'),
    service_ids: formData.getAll('service_id'),
  })
  if (!parsed.success) return
  const { staff_id: staffId, service_ids: serviceIds } = parsed.data

  const { data: staffRow } = await supabase
    .from('staff')
    .select('id')
    .eq('id', staffId)
    .eq('business_id', business.id)
    .maybeSingle()
  if (!staffRow) return

  await supabase.from('staff_services').delete().eq('staff_id', staffId).eq('business_id', business.id)
  if (serviceIds.length > 0) {
    await supabase
      .from('staff_services')
      .insert(serviceIds.map((serviceId) => ({ business_id: business.id, staff_id: staffId, service_id: serviceId })))
  }
  revalidatePath('/appointments/dashboard/staff')
}
