import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

// Slugifies `name`, then appends a random suffix if the slug is already taken.
export async function uniqueBusinessSlug(db: SupabaseClient, name: string): Promise<string> {
  let slug = slugify(name)
  if (slug.length < 3) slug = `business-${slug}`
  const { count } = await db.from('businesses').select('id', { count: 'exact', head: true }).eq('slug', slug)
  if (count && count > 0) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
  return slug
}
