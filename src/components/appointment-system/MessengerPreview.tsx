import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

// Shown instead of the (disabled) connection form when the business isn't
// entitled to the Messenger bot — a sample conversation sells the feature
// better than a greyed-out password field, per the "preview, not disabled"
// rule.
export default function MessengerPreview({ tierName, priceMonthly }: { tierName: string; priceMonthly: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-emerald-600 px-3.5 py-2 text-sm text-white">
          Hi! Pwede po ba magpa-book ng haircut? 💇
        </div>
      </div>
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-800 px-3.5 py-2 text-sm text-slate-200">
          Hi po! 👋 Which service would you like to book?
        </div>
      </div>
      <div className="flex flex-wrap gap-2 justify-start pl-1">
        {['Haircut', 'Hair Color', 'Manicure'].map((s) => (
          <span key={s} className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            {s}
          </span>
        ))}
      </div>
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-emerald-600 px-3.5 py-2 text-sm text-white">
          Haircut
        </div>
      </div>
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-800 px-3.5 py-2 text-sm text-slate-200">
          Great choice! Here are the next open slots with Maria — pick one below. ✅
        </div>
      </div>
      <div className="flex items-center gap-2 pl-1 pt-2 text-xs text-slate-500">
        <MessageCircle className="h-3.5 w-3.5" aria-hidden />
        The bot handles this entire conversation automatically — no typing required from you.
      </div>
      <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-200">
        This is a preview — connect a real Page once you&apos;re on the {tierName} plan (₱
        {priceMonthly.toLocaleString('en-PH')}/mo).{' '}
        <Link href="/appointments#pricing" className="font-semibold underline underline-offset-4">
          Compare plans
        </Link>
        .
      </div>
    </div>
  )
}
