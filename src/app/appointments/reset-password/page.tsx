'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleCheck } from 'lucide-react'
import { createBrowserSupabase } from '@/lib/appointment-system/supabase'
import { AuthHeader, AuthFooter } from '@/components/appointment-system/AuthChrome'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const readyRef = useRef(false)

  useEffect(() => {
    const supabase = createBrowserSupabase()
    // Only the PASSWORD_RECOVERY event proves this page was reached via a valid reset
    // link — an existing session (e.g. already logged in elsewhere in this browser)
    // looks identical to a real recovery session if checked via getSession() alone.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        readyRef.current = true
        setReady(true)
      }
    })
    const timeout = setTimeout(() => {
      if (!readyRef.current) setExpired(true)
    }, 4000)
    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setPending(true)
    const supabase = createBrowserSupabase()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setPending(false)
    if (updateError) return setError('Could not update your password — please try the reset link again.')
    setSuccess(true)
    setTimeout(() => router.push('/appointments/login'), 2000)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <AuthHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/appointments" className="block text-center text-2xl font-bold text-white mb-2">
          Appointment <span className="text-emerald-400">System</span>
        </Link>
        <p className="text-center text-slate-400 mb-8 text-sm">Set a new password.</p>

        {success ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
            <CircleCheck className="mx-auto mb-2 h-8 w-8 text-emerald-300" aria-hidden />
            <p className="text-emerald-300 font-medium">Password updated</p>
            <p className="text-slate-300 text-sm mt-2">Redirecting you to log in…</p>
          </div>
        ) : expired && !ready ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-6 text-center">
            <p className="text-amber-200 font-medium">This reset link is invalid or has expired.</p>
            <p className="text-slate-300 text-sm mt-2">
              <Link href="/appointments/forgot-password" className="underline text-emerald-300">
                Request a new one
              </Link>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
            <label className="block">
              <span className="text-sm text-slate-300">New password</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ characters"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-300">Confirm new password</span>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
              />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={pending || !ready}
              className="w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              {!ready ? 'Verifying reset link…' : pending ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
      </main>
      <AuthFooter />
    </div>
  )
}
