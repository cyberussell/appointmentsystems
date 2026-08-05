'use client'

import { sendGAEvent } from '@next/third-parties/google'

// Thin wrapper over the site's existing GA4 setup (root layout). Never throws.
export function track(event: string, params: Record<string, string | number> = {}): void {
  try {
    sendGAEvent('event', event, params)
  } catch {
    // analytics must never break the page
  }
}
