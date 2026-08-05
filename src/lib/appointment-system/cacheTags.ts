// Shared so the tag used by unstable_cache on the public booking page and
// the revalidatePath/revalidateTag calls in mutations can never drift apart.
export function businessPageCacheTag(slug: string): string {
  return `business-page:${slug}`
}
