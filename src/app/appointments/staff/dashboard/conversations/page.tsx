import { TriangleAlert } from 'lucide-react'
import { requireStaffAccess } from '@/lib/appointment-system/auth'
import { getTerms } from '@/lib/appointment-system/terminology'
import { hasFeature } from '@/lib/appointment-system/entitlements'
import { resumeBot } from '../../../actions'

export const dynamic = 'force-dynamic'

export default async function StaffConversationsPage() {
  const { supabase, business } = await requireStaffAccess()
  const t = getTerms(business.business_types)
  const hasBot = hasFeature(business, 'messenger_booking_bot')

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('business_id', business.id)
    .order('last_message_at', { ascending: false })
    .limit(100)

  const list = conversations ?? []
  const handoffs = list.filter((c) => c.mode === 'human')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Messenger conversations</h1>
        {!hasBot ? (
          <p className="text-slate-400 text-sm mt-1">
            Messenger automation isn&apos;t active on this business&apos;s plan yet.
          </p>
        ) : (
          <p className="text-slate-400 text-sm mt-1">
            {handoffs.length > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <TriangleAlert className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                {handoffs.length} conversation{handoffs.length === 1 ? '' : 's'} waiting for a human reply.
              </span>
            ) : (
              'The bot is handling everything. Handed-off chats will appear here.'
            )}
          </p>
        )}
      </div>

      <ul className="space-y-2">
        {list.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between gap-3"
          >
            <div>
              <p className="font-medium text-sm">
                {t.Client} {c.psid.slice(-6)}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    c.mode === 'human' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
                  }`}
                >
                  {c.mode === 'human' ? 'with staff' : 'bot'}
                </span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Last activity: {new Date(c.last_message_at).toLocaleString('en-PH', { timeZone: business.timezone })}
              </p>
            </div>
            {c.mode === 'human' && (
              <form action={resumeBot}>
                <input type="hidden" name="id" value={c.id} />
                <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-400 hover:text-emerald-300 transition">
                  Hand back to bot
                </button>
              </form>
            )}
          </li>
        ))}
        {list.length === 0 && <li className="text-slate-500 text-sm">No conversations yet.</li>}
      </ul>
    </div>
  )
}
