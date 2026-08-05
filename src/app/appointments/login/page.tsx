'use client'

import { useActionState, useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { signIn, resendConfirmation, type ActionResult } from '../actions'
import { AuthHeader, AuthFooter } from '@/components/appointment-system/AuthChrome'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(signIn, {})
  const [email, setEmail] = useState('')
  const [resendPending, startResendTransition] = useTransition()
  const [resendResult, setResendResult] = useState<ActionResult | null>(null)
  const needsConfirmation = state.error === 'EMAIL_NOT_CONFIRMED'

  function handleResend() {
    setResendResult(null)
    startResendTransition(async () => {
      setResendResult(await resendConfirmation(email))
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <AuthHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/appointments" className="mb-8 flex flex-col items-center text-center">
          <Image src="/appointments-assets/appointment-logo.png" alt="" width={56} height={56} className="mb-3 h-14 w-14 rounded-2xl object-cover" priority unoptimized />
          <span className="text-2xl font-bold text-white">
            Appointment <span className="text-emerald-400">System</span>
          </span>
        </Link>
        <form action={formAction} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <label className="block">
            <span className="text-sm text-slate-300">Email</span>
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-300">Password</span>
            <input
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
            />
            <Link href="/appointments/forgot-password" className="mt-1 inline-block text-xs text-emerald-400 hover:underline">
              Forgot password?
            </Link>
          </label>
          {state.error && !needsConfirmation && <p className="text-sm text-red-400">{state.error}</p>}
          {needsConfirmation && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <p>
                Please confirm your email before logging in — check your inbox for the confirmation link
                we sent when you signed up.
              </p>
              {resendResult && !resendResult.error ? (
                <p className="mt-2 text-emerald-300">Confirmation email resent — check your inbox.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendPending}
                  className="mt-2 font-medium underline underline-offset-4 hover:text-amber-100 disabled:opacity-50"
                >
                  {resendPending ? 'Resending…' : "Didn't get it? Resend confirmation email"}
                </button>
              )}
              {resendResult?.error && <p className="mt-2 text-red-400">{resendResult.error}</p>}
            </div>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
          >
            {pending ? 'Logging in…' : 'Log in'}
          </button>
          <p className="text-center text-sm text-slate-400">
            New here?{' '}
            <Link href="/appointments/signup" className="text-emerald-400 hover:underline">
              Create your account
            </Link>
          </p>
        </form>
      </div>
      </main>
      <AuthFooter />
    </div>
  )
}
