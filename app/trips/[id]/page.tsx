import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../lib/db";
import { trips, items, ITEM_KINDS } from "../../../drizzle/schema";
import { Field, inputCls, submitBtnCls } from "../../_components/form-bits";
import { ConfirmButton } from "../../_components/ConfirmButton";
import { KIND_LABELS, KIND_ICON } from "../../../lib/item-kinds";

export const dynamic = "force-dynamic";

const KIND_BADGE: Record<(typeof ITEM_KINDS)[number], string> = {
  vuelo: "bg-sky-100 text-sky-800",
  hotel: "bg-violet-100 text-violet-800",
  auto: "bg-amber-100 text-amber-800",
  excursion: "bg-emerald-100 text-emerald-800",
  restaurante: "bg-rose-100 text-rose-800",
  otro: "bg-slate-100 text-slate-700",
};

const KIND_BORDER: Record<(typeof ITEM_KINDS)[number], string> = {
  vuelo: "border-l-sky-500",
  hotel: "border-l-violet-500",
  auto: "border-l-amber-500",
  excursion: "border-l-emerald-500",
  restaurante: "border-l-rose-500",
  otro: "border-l-slate-400",
};

const RESOURCES: {
  name: string;
  icon: string;
  description: string;
  urlFor: (dest: string) => string;
}[] = [
  {
    name: "Time Out",
    icon: "🎟️",
    description: "Restaurantes, bares y eventos",
    urlFor: (d) =>
      `https://www.timeout.com/search?query=${encodeURIComponent(d)}`,
  },
  {
    name: "Wikivoyage",
    icon: "📖",
    description: "Guía: ver, comer, dormir",
    urlFor: (d) =>
      `https://es.wikivoyage.org/w/index.php?search=${encodeURIComponent(d)}`,
  },
  {
    name: "Google Maps",
    icon: "🗺️",
    description: "Mapa, lugares cerca, reviews",
    urlFor: (d) =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d)}`,
  },
  {
    name: "Tripadvisor",
    icon: "⭐",
    description: "Atracciones rankeadas",
    urlFor: (d) =>
      `https://www.tripadvisor.es/Search?q=${encodeURIComponent(d)}`,
  },
];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatItemTime(
  startAt: Date | null,
  endAt: Date | null,
  full = false
) {
  if (!startAt && !endAt) return null;
  const time = (d: Date) =>
    d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const dateTime = (d: Date) => d.toLocaleString("es-AR");
  const fmt = full ? dateTime : time;

  if (!startAt) return dateTime(new Date(endAt!));
  const start = new Date(startAt);
  if (!endAt) return fmt(start);

  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay
    ? `${fmt(start)} → ${time(end)}`
    : `${fmt(start)} → ${dateTime(end)}`;
}

type ItemRow = {
  id: number;
  tripId: number;
  kind: string;
  name: string;
  startAt: Date | null;
  endAt: Date | null;
  cost: string | null;
  link: string | null;
  notes: string | null;
  createdAt: Date;
};

function groupByDay(rows: ItemRow[]) {
  const groups = new Map<string, { label: string; rows: ItemRow[] }>();
  for (const it of rows) {
    let key: string;
    let label: string;
    if (it.startAt) {
      const d = new Date(it.startAt);
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      label = capitalize(
        d.toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      );
    } else {
      key = "zzz-no-date";
      label = "Sin fecha";
    }
    const existing = groups.get(key);
    if (existing) existing.rows.push(it);
    else groups.set(key, { label, rows: [it] });
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, g]) => ({ key, ...g }));
}

function groupByKind(rows: ItemRow[]) {
  return ITEM_KINDS.map((kind) => ({
    key: kind,
    label: KIND_LABELS[kind],
    rows: rows.filter((it) => it.kind === kind),
  })).filter((g) => g.rows.length > 0);
}

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;
  const groupedByKind = view === "kind";
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

      {trip.coverImageUrl ? (
        <div className="relative mt-3 h-72 overflow-hidden rounded-2xl shadow-md">
          <img
            src={trip.coverImageUrl}
            alt={trip.destination ?? trip.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute right-3 top-3 flex gap-2">
            <Link
              href={`/trips/${tripId}/edit`}
              className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 backdrop-blur transition hover:bg-white"
            >
              Editar
            </Link>
            <ConfirmButton
              action={deleteTripBound}
              message={`¿Borrar el viaje "${trip.name}" y todos sus items? No se puede deshacer.`}
              className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-red-700 backdrop-blur transition hover:bg-white"
            >
              Borrar
            </ConfirmButton>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            <h1 className="text-3xl font-bold drop-shadow-md">{trip.name}</h1>
            {trip.destination && (
              <div className="mt-1 text-white/90 drop-shadow">
                {trip.destination}
              </div>
            )}
            {(trip.startDate || trip.endDate) && (
              <div className="mt-1 text-sm text-white/80 drop-shadow">
                {trip.startDate ?? "?"} → {trip.endDate ?? "?"}
              </div>
            )}
          </div>
        </div>
      ) : (
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
      )}

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

      {trip.destination && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">
            Recursos para {trip.destination}
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {RESOURCES.map((r) => (
              <a
                key={r.name}
                href={r.urlFor(trip.destination!)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-400 hover:shadow-sm"
              >
                <span className="text-2xl">{r.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.description}</div>
                </div>
                <span className="text-slate-400" aria-hidden>
                  ↗
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Items</h2>
        {tripItems.length > 0 && (
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
            <Link
              href={`/trips/${tripId}`}
              className={`rounded-md px-3 py-1 font-medium transition ${
                groupedByKind
                  ? "text-slate-600 hover:text-slate-900"
                  : "bg-slate-900 text-white"
              }`}
            >
              Por día
            </Link>
            <Link
              href={`/trips/${tripId}?view=kind`}
              className={`rounded-md px-3 py-1 font-medium transition ${
                groupedByKind
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Por tipo
            </Link>
          </div>
        )}
      </div>
      {tripItems.length === 0 ? (
        <p className="mt-3 text-slate-600">
          Todavía no hay items. Sumá el primero abajo.
        </p>
      ) : (
        <div className="mt-4 space-y-6">
          {(groupedByKind
            ? groupByKind(tripItems)
            : groupByDay(tripItems)
          ).map(({ key, label, rows }) => (
            <section key={key}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {groupedByKind && (
                  <span className="mr-1.5 text-base">
                    {KIND_ICON[key as (typeof ITEM_KINDS)[number]] ?? ""}
                  </span>
                )}
                {label}
              </h3>
              <ul className="space-y-2">
                {rows.map((it) => {
                  const kind = it.kind as (typeof ITEM_KINDS)[number];
                  const deleteItemBound = deleteItem.bind(null, it.id, tripId);
                  const timeLabel = formatItemTime(
                    it.startAt,
                    it.endAt,
                    groupedByKind
                  );
                  return (
                    <li
                      key={it.id}
                      className={`rounded-xl border border-slate-200 border-l-4 bg-white px-4 py-3 ${
                        KIND_BORDER[kind] ?? KIND_BORDER.otro
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-semibold">{it.name}</span>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            KIND_BADGE[kind] ?? KIND_BADGE.otro
                          }`}
                        >
                          <span className="mr-1">{KIND_ICON[kind] ?? KIND_ICON.otro}</span>
                          {KIND_LABELS[kind] ?? it.kind}
                        </span>
                      </div>
                      {timeLabel && (
                        <div className="mt-1 text-sm text-slate-500 tabular-nums">
                          {timeLabel}
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
            </section>
          ))}
        </div>
      )}

      <h2 className="mt-12 text-lg font-semibold">Nuevo item</h2>
      <form action={createItemBound} className="mt-3 grid max-w-lg gap-3">
        <Field label="Tipo">
          <select name="kind" required defaultValue="vuelo" className={inputCls}>
            {ITEM_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_ICON[k]}  {KIND_LABELS[k]}
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
