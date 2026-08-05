'use client'

import Link from 'next/link'
import { track } from './track'

export default function TrackedLink({
  href,
  event,
  params,
  className,
  children,
}: {
  href: string
  event: string
  params?: Record<string, string | number>
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className={className} onClick={() => track(event, params)}>
      {children}
    </Link>
  )
}
