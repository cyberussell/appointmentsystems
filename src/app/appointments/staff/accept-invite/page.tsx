'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleCheck } from 'lucide-react'
import { createBrowserSupabase } from '@/lib/appointment-system/supabase'
import { AuthHeader, AuthFooter } from '@/components/appointment-system/AuthChrome'

export default function AcceptStaffInvitePage() {
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
    // Invite links sign the user in automatically (unlike reset-password links,
    // which fire PASSWORD_RECOVERY) — SIGNED_IN is what proves this page was
    // reached via a valid invite, not just an existing session elsewhere.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
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
    if (updateError) return setError('Could not set your password — please try the invite link again.')
    setSuccess(true)
    setTimeout(() => router.push('/appointments/staff/dashboard'), 1500)
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <AuthHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link href="/appointments" className="block text-center text-2xl font-bold text-white mb-2">
            Appointment <span className="text-emerald-400">System</span>
          </Link>
          <p className="text-center text-slate-400 mb-8 text-sm">
            You&apos;ve been invited to log in as staff — set a password to finish.
          </p>

          {success ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
              <CircleCheck className="mx-auto mb-2 h-8 w-8 text-emerald-300" aria-hidden />
              <p className="text-emerald-300 font-medium">Password set</p>
              <p className="text-slate-300 text-sm mt-2">Taking you to your dashboard…</p>
            </div>
          ) : expired && !ready ? (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-6 text-center">
              <p className="text-amber-200 font-medium">This invite link is invalid or has expired.</p>
              <p className="text-slate-300 text-sm mt-2">Ask the business owner to send a new invite.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
              <label className="block">
                <span className="text-sm text-slate-300">Set a password</span>
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
                <span className="text-sm text-slate-300">Confirm password</span>
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
                {!ready ? 'Verifying invite…' : pending ? 'Setting password…' : 'Set password & continue'}
              </button>
            </form>
          )}
        </div>
      </main>
      <AuthFooter />
    </div>
  )
}
