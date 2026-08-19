import { requireBusiness } from '@/lib/appointment-system/auth'
import { getTerms } from '@/lib/appointment-system/terminology'
import { createService, updateService, toggleService, deleteService } from '../../actions'
import SubmitButton from '@/components/appointment-system/SubmitButton'

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
        <SubmitButton
          pendingText="Adding…"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition"
        >
          Add service
        </SubmitButton>
      </form>

      <ul className="space-y-2">
        {(services ?? []).map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <form
              action={updateService}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="id" value={s.id} />
              <input
                name="name"
                defaultValue={s.name}
                required
                className={`rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium focus:border-emerald-400 focus:outline-none ${s.active ? '' : 'text-slate-500'}`}
              />
              <input
                name="duration_min"
                type="number"
                min={5}
                max={480}
                step={5}
                required
                defaultValue={s.duration_min}
                className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 focus:border-emerald-400 focus:outline-none"
              />
              <input
                name="price"
                type="number"
                min={0}
                step={50}
                defaultValue={Number(s.price)}
                className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 focus:border-emerald-400 focus:outline-none"
              />
              <SubmitButton
                pendingText="Saving…"
                className="rounded-lg border border-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition"
              >
                Save
              </SubmitButton>
            </form>
            <div className="flex gap-2">
              <form action={toggleService}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="active" value={String(s.active)} />
                <SubmitButton
                  pendingText={s.active ? 'Disabling…' : 'Enabling…'}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-400 transition"
                >
                  {s.active ? 'Disable' : 'Enable'}
                </SubmitButton>
              </form>
              <form action={deleteService}>
                <input type="hidden" name="id" value={s.id} />
                <SubmitButton
                  pendingText="Deleting…"
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-red-400 hover:border-red-400 transition"
                >
                  Delete
                </SubmitButton>
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
