'use client'

import DashboardErrorFallback from '@/components/appointment-system/DashboardErrorFallback'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <DashboardErrorFallback error={error} reset={reset} />
}
