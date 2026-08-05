'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Lock } from 'lucide-react'
import type { FeatureFlag } from '@/lib/appointment-system/entitlements'

interface NavItem {
  path: string // relative to the role's dashboard root; '' = the root itself
  label: string
  roles: ('owner' | 'staff')[]
  /** Set when this page is tied to a plan feature — nav stays clickable either way, this just adds a lock glyph so the ladder is discoverable instead of a surprise on click. */
  lockedUnless?: FeatureFlag
}

const NAV: NavItem[] = [
  { path: '', label: 'Today', roles: ['owner', 'staff'] },
  { path: '/appointments', label: 'Appointments', roles: ['owner', 'staff'] },
  { path: '/services', label: 'Services', roles: ['owner'] },
  { path: '/staff', label: 'Staff', roles: ['owner'] },
  { path: '/availability', label: 'Availability', roles: ['owner'] },
  { path: '/clients', label: 'Clients', roles: ['owner', 'staff'] },
  { path: '/conversations', label: 'Conversations', roles: ['owner', 'staff'], lockedUnless: 'messenger_booking_bot' },
  { path: '/reports', label: 'Reports', roles: ['owner'], lockedUnless: 'basic_reporting' },
  { path: '/billing', label: 'Billing', roles: ['owner'] },
  { path: '/settings', label: 'Settings', roles: ['owner'] },
  { path: '/help', label: 'Help', roles: ['owner'] },
]

export default function NavTabs({
  clientsLabel = 'Clients',
  entitledFeatures = [],
  role = 'owner',
}: {
  clientsLabel?: string
  entitledFeatures?: FeatureFlag[]
  role?: 'owner' | 'staff'
}) {
  const pathname = usePathname()
  const router = useRouter()

  const basePath = role === 'staff' ? '/appointments/staff/dashboard' : '/appointments/dashboard'
  const items = NAV.filter((item) => item.roles.includes(role))
  const hrefFor = (item: NavItem) => `${basePath}${item.path}`
  const isActive = (item: NavItem) => {
    const href = hrefFor(item)
    return item.path === '' ? pathname === href : pathname.startsWith(href)
  }
  const labelFor = (item: NavItem) => (item.path === '/clients' ? clientsLabel : item.label)
  const isLocked = (item: NavItem) => item.lockedUnless !== undefined && !entitledFeatures.includes(item.lockedUnless)
  const current = items.find((item) => isActive(item)) ?? items[0]

  return (
    <nav className="mx-auto max-w-6xl px-4">
      <div className="relative py-2 sm:hidden">
        <select
          aria-label="Dashboard section"
          value={hrefFor(current)}
          onChange={(e) => router.push(e.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 pr-9 text-sm font-semibold text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        >
          {items.map((item) => (
            <option key={item.path} value={hrefFor(item)}>
              {labelFor(item)}
              {isLocked(item) ? ' 🔒' : ''}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-6 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
      </div>

      <div className="hidden gap-1 overflow-x-auto sm:flex">
        {items.map((item) => {
          const active = isActive(item)
          const locked = isLocked(item)
          return (
            <Link
              key={item.path}
              href={hrefFor(item)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm border-b-2 transition ${
                active
                  ? 'text-emerald-300 border-emerald-400 font-semibold'
                  : 'text-slate-300 border-transparent hover:text-emerald-300 hover:border-emerald-400/50'
              }`}
            >
              {labelFor(item)}
              {locked && <Lock className="h-3 w-3 text-slate-500" aria-label="Available on a higher plan" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
