'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { requestPasswordReset, type ActionResult } from '../actions'
import { AuthHeader, AuthFooter } from '@/components/appointment-system/AuthChrome'

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(requestPasswordReset, {})
  const sent = state.error === 'SENT'

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <AuthHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/appointments" className="block text-center text-2xl font-bold text-white mb-2">
          Appointment <span className="text-emerald-400">System</span>
        </Link>
        <p className="text-center text-slate-400 mb-8 text-sm">Reset your password.</p>

        {sent ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <MailCheck className="mx-auto mb-2 h-8 w-8 text-emerald-300" aria-hidden />
            <p className="text-emerald-300 font-medium">Check your email</p>
            <p className="text-slate-300 text-sm mt-2">
              If an account exists for that address, we&apos;ve sent a password reset link.{' '}
              <Link href="/appointments/login" className="underline text-emerald-300">Back to login</Link>.
            </p>
          </div>
        ) : (
          <form action={formAction} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <label className="block">
              <span className="text-sm text-slate-300">Email</span>
              <input
                name="email"
                type="email"
                required
                placeholder="you@business.com"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </label>
            {state.error && !sent && <p className="text-sm text-red-400">{state.error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              {pending ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-sm text-slate-400">
              <Link href="/appointments/login" className="text-emerald-400 hover:underline">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
      </main>
      <AuthFooter />
    </div>
  )
}
