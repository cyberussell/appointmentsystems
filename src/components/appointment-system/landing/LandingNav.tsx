'use client'

import { useState } from 'react'
import Link from 'next/link'
import { track } from './track'

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
]

export default function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50">
      <nav className="as-glass border-x-0 border-t-0" aria-label="Main">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/appointments" className="font-bold text-white text-lg tracking-tight">
            Appointment <span className="text-emerald-400">System</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-slate-300 hover:text-white transition">
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/appointments/login" className="text-sm text-slate-300 hover:text-white transition">
              Sign In
            </Link>
            <Link
              href="/appointments/signup"
              onClick={() => track('landing_cta_clicked', { location: 'nav' })}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition"
            >
              Start Free
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden rounded-lg p-2 text-slate-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        {open && (
          <div id="landing-mobile-menu" className="md:hidden border-t border-white/10 px-4 pb-4 pt-2">
            <div className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/10"
                >
                  {l.label}
                </a>
              ))}
              <Link href="/appointments/login" className="rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/10">
                Sign In
              </Link>
              <Link
                href="/appointments/signup"
                onClick={() => track('landing_cta_clicked', { location: 'nav_mobile' })}
                className="mt-2 rounded-lg bg-emerald-500 px-3 py-2.5 text-center text-sm font-semibold text-slate-950"
              >
                Start Free
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
