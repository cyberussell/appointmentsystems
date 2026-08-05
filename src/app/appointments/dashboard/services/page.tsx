import { requireBusiness } from '@/lib/appointment-system/auth'
import { getTerms } from '@/lib/appointment-system/terminology'
import { createService, toggleService, deleteService } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
  const { supabase, business } = await requireBusiness()
  const t = getTerms(business.business_types)
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Services</h1>
        <p className="text-slate-400 text-sm mt-1">
          What {t.clients} can book — these show up as buttons in Messenger.
        </p>
      </div>

      <form
        action={createService}
        className="rounded-xl border border-slate-800 bg-slate-900 p-4 grid gap-3 sm:grid-cols-[1fr_140px_140px_auto]"
      >
        <input
          name="name"
          required
          placeholder="Service name (e.g. Cleaning)"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        />
        <input
          name="duration_min"
          type="number"
          min={5}
          max={480}
          step={5}
          required
          placeholder="Minutes"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        />
        <input
          name="price"
          type="number"
          min={0}
          step={50}
          placeholder="Price ₱"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
        />
        <button className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition">
          Add service
        </button>
      </form>

      <ul className="space-y-2">
        {(services ?? []).map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between gap-3"
          >
            <div>
              <p className={`font-medium ${s.active ? '' : 'text-slate-500 line-through'}`}>
                {s.name}
              </p>
              <p className="text-sm text-slate-400">
                {s.duration_min} min · ₱{Number(s.price).toFixed(0)}
              </p>
            </div>
            <div className="flex gap-2">
              <form action={toggleService}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="active" value={String(s.active)} />
                <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-400 transition">
                  {s.active ? 'Disable' : 'Enable'}
                </button>
              </form>
              <form action={deleteService}>
                <input type="hidden" name="id" value={s.id} />
                <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-red-400 hover:border-red-400 transition">
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
        {(services ?? []).length === 0 && (
          <li className="text-slate-500 text-sm">No services yet — add your first one above.</li>
        )}
      </ul>
    </div>
  )
}
