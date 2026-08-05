import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { AuthHeader, AuthFooter } from '@/components/appointment-system/AuthChrome'

export default function NotAuthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <AuthHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-amber-300" aria-hidden />
          <h1 className="text-xl font-bold text-white">This page is for business owners only</h1>
          <p className="mt-2 text-sm text-slate-400">
            You&apos;re signed in as a staff member — this section isn&apos;t part of your dashboard.
          </p>
          <Link
            href="/appointments/staff/dashboard"
            className="mt-6 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
          >
            Go to your dashboard
          </Link>
        </div>
      </main>
      <AuthFooter />
    </div>
  )
}
