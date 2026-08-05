'use server'

import { revalidatePath } from 'next/cache'
import { requireBusinessAccess } from '@/lib/appointment-system/auth'

export async function resumeBot(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusinessAccess()
  await supabase
    .from('conversations')
    .update({ mode: 'bot' })
    .eq('id', String(formData.get('id')))
    .eq('business_id', business.id)
  revalidatePath('/appointments/dashboard/conversations')
}
