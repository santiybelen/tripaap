import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../lib/db";
import { trips, items, ITEM_KINDS } from "../../../drizzle/schema";
import { Field, inputCls, submitBtnCls } from "../../_components/form-bits";
import { ConfirmButton } from "../../_components/ConfirmButton";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<(typeof ITEM_KINDS)[number], string> = {
  vuelo: "Vuelo",
  hotel: "Hotel",
  auto: "Auto",
  excursion: "Excursión",
  restaurante: "Restaurante",
  otro: "Otro",
};

const KIND_BADGE: Record<(typeof ITEM_KINDS)[number], string> = {
  vuelo: "bg-sky-100 text-sky-800",
  hotel: "bg-violet-100 text-violet-800",
  auto: "bg-amber-100 text-amber-800",
  excursion: "bg-emerald-100 text-emerald-800",
  restaurante: "bg-rose-100 text-rose-800",
  otro: "bg-slate-100 text-slate-700",
};

async function createItem(tripId: number, formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  if (!name || !ITEM_KINDS.includes(kind as (typeof ITEM_KINDS)[number])) return;

  const startAtRaw = String(formData.get("startAt") ?? "").trim();
  const endAtRaw = String(formData.get("endAt") ?? "").trim();
  const costRaw = String(formData.get("cost") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await getDb().insert(items).values({
    tripId,
    kind,
    name,
    startAt: startAtRaw ? new Date(startAtRaw) : null,
    endAt: endAtRaw ? new Date(endAtRaw) : null,
    cost: costRaw || null,
    link,
    notes,
  });

  revalidatePath(`/trips/${tripId}`);
}

async function deleteItem(itemId: number, tripId: number) {
  "use server";
  await getDb().delete(items).where(eq(items.id, itemId));
  revalidatePath(`/trips/${tripId}`);
}

async function deleteTrip(tripId: number) {
  "use server";
  await getDb().delete(trips).where(eq(trips.id, tripId));
  redirect("/trips");
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tripId = Number(id);
  if (!Number.isFinite(tripId)) notFound();

  const db = getDb();
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
  if (!trip) notFound();

  const tripItems = await db
    .select()
    .from(items)
    .where(eq(items.tripId, tripId))
    .orderBy(asc(items.startAt), asc(items.createdAt));

  const totalCost = tripItems.reduce(
    (sum, it) => sum + (it.cost ? Number(it.cost) : 0),
    0
  );
  const costByKind = ITEM_KINDS.reduce(
    (acc, k) => {
      acc[k] = tripItems
        .filter((it) => it.kind === k && it.cost)
        .reduce((s, it) => s + Number(it.cost), 0);
      return acc;
    },
    {} as Record<(typeof ITEM_KINDS)[number], number>
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const createItemBound = createItem.bind(null, tripId);
  const deleteTripBound = deleteTrip.bind(null, tripId);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/trips" className="text-sm text-slate-500 hover:text-slate-700">
        ← Todos los viajes
      </Link>

      <header className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{trip.name}</h1>
          {trip.destination && (
            <div className="mt-1 text-slate-700">{trip.destination}</div>
          )}
          {(trip.startDate || trip.endDate) && (
            <div className="mt-1 text-sm text-slate-500">
              {trip.startDate ?? "?"} → {trip.endDate ?? "?"}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/trips/${tripId}/edit`}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Editar
          </Link>
          <ConfirmButton
            action={deleteTripBound}
            message={`¿Borrar el viaje "${trip.name}" y todos sus items? No se puede deshacer.`}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
          >
            Borrar
          </ConfirmButton>
        </div>
      </header>

      {totalCost > 0 && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-slate-600">Total</span>
            <span className="text-xl font-semibold tabular-nums">
              $ {fmt(totalCost)}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {ITEM_KINDS.filter((k) => costByKind[k] > 0).map((k) => (
              <div key={k} className="flex justify-between">
                <span className="text-slate-600">{KIND_LABELS[k]}</span>
                <span className="font-medium tabular-nums">
                  $ {fmt(costByKind[k])}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <h2 className="mt-10 text-lg font-semibold">Items</h2>
      {tripItems.length === 0 ? (
        <p className="mt-3 text-slate-600">
          Todavía no hay items. Sumá el primero abajo.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tripItems.map((it) => {
            const kind = it.kind as (typeof ITEM_KINDS)[number];
            const deleteItemBound = deleteItem.bind(null, it.id, tripId);
            return (
              <li
                key={it.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold">{it.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      KIND_BADGE[kind] ?? KIND_BADGE.otro
                    }`}
                  >
                    {KIND_LABELS[kind] ?? it.kind}
                  </span>
                </div>
                {(it.startAt || it.endAt) && (
                  <div className="mt-1 text-sm text-slate-500">
                    {it.startAt ? new Date(it.startAt).toLocaleString("es-AR") : "?"}
                    {it.endAt && ` → ${new Date(it.endAt).toLocaleString("es-AR")}`}
                  </div>
                )}
                {it.cost && (
                  <div className="mt-1 text-sm text-slate-700">$ {it.cost}</div>
                )}
                {it.link && (
                  <div className="mt-1 text-sm">
                    <a
                      href={it.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-700 underline-offset-2 hover:underline"
                    >
                      {it.link}
                    </a>
                  </div>
                )}
                {it.notes && (
                  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                    {it.notes}
                  </div>
                )}
                <div className="mt-3 flex gap-2 text-sm">
                  <Link
                    href={`/trips/${tripId}/items/${it.id}/edit`}
                    className="font-medium text-slate-700 hover:text-slate-900"
                  >
                    Editar
                  </Link>
                  <span className="text-slate-300">·</span>
                  <ConfirmButton
                    action={deleteItemBound}
                    message={`¿Borrar "${it.name}"?`}
                    className="font-medium text-red-700 hover:text-red-900"
                  >
                    Borrar
                  </ConfirmButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-12 text-lg font-semibold">Nuevo item</h2>
      <form action={createItemBound} className="mt-3 grid max-w-lg gap-3">
        <Field label="Tipo">
          <select name="kind" required defaultValue="vuelo" className={inputCls}>
            {ITEM_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nombre">
          <input
            name="name"
            required
            placeholder="AA1234 BUE→BRC"
            className={inputCls}
          />
        </Field>
        <div className="flex gap-3">
          <Field label="Desde" className="flex-1">
            <input name="startAt" type="datetime-local" className={inputCls} />
          </Field>
          <Field label="Hasta" className="flex-1">
            <input name="endAt" type="datetime-local" className={inputCls} />
          </Field>
        </div>
        <Field label="Costo">
          <input
            name="cost"
            type="number"
            step="0.01"
            placeholder="0.00"
            className={inputCls}
          />
        </Field>
        <Field label="Link (booking, mail, etc.)">
          <input name="link" type="url" placeholder="https://..." className={inputCls} />
        </Field>
        <Field label="Notas">
          <textarea name="notes" rows={3} className={`${inputCls} resize-y`} />
        </Field>
        <button type="submit" className={submitBtnCls}>
          Guardar item
        </button>
      </form>
    </main>
  );
}
