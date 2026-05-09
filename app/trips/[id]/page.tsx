import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../lib/db";
import {
  trips,
  tripDestinations,
  items,
  ITEM_KINDS,
  TRANSPORT_MODES,
} from "../../../drizzle/schema";
import { Field, inputCls, submitBtnCls } from "../../_components/form-bits";
import { ConfirmButton } from "../../_components/ConfirmButton";
import {
  KIND_LABELS,
  KIND_ICON,
  KIND_PLURAL,
} from "../../../lib/item-kinds";
import { TRANSPORT_LABELS, TRANSPORT_ICON } from "../../../lib/transport-modes";
import { fetchDestinationPhoto } from "../../../lib/destination-photo";
import { parseSlug, buildSlug } from "../../../lib/trip-slug";
import { getTraveler, setTraveler } from "../../../lib/traveler";

export const dynamic = "force-dynamic";

const KIND_BADGE: Record<(typeof ITEM_KINDS)[number], string> = {
  vuelo: "bg-sky-100 text-sky-800",
  hotel: "bg-violet-100 text-violet-800",
  auto: "bg-amber-100 text-amber-800",
  restaurante: "bg-rose-100 text-rose-800",
  bar: "bg-yellow-100 text-yellow-800",
  disco: "bg-fuchsia-100 text-fuchsia-800",
  excursion: "bg-emerald-100 text-emerald-800",
  otro: "bg-slate-100 text-slate-700",
};

const KIND_BORDER: Record<(typeof ITEM_KINDS)[number], string> = {
  vuelo: "border-l-sky-500",
  hotel: "border-l-violet-500",
  auto: "border-l-amber-500",
  restaurante: "border-l-rose-500",
  bar: "border-l-yellow-500",
  disco: "border-l-fuchsia-500",
  excursion: "border-l-emerald-500",
  otro: "border-l-slate-400",
};

const KIND_TAB_ACTIVE: Record<(typeof ITEM_KINDS)[number], string> = {
  vuelo: "bg-sky-500 text-white",
  hotel: "bg-violet-500 text-white",
  auto: "bg-amber-500 text-white",
  restaurante: "bg-rose-500 text-white",
  bar: "bg-yellow-500 text-white",
  disco: "bg-fuchsia-500 text-white",
  excursion: "bg-emerald-500 text-white",
  otro: "bg-slate-500 text-white",
};

const TAB_KINDS = [
  "vuelo",
  "hotel",
  "auto",
  "restaurante",
  "bar",
  "disco",
  "excursion",
] as const satisfies readonly (typeof ITEM_KINDS)[number][];

const RESOURCES: {
  name: string;
  icon: string;
  description: string;
  urlFor: (dest: string) => string;
}[] = [
  {
    name: "Time Out",
    icon: "🎟️",
    description: "Restaurantes, bares, eventos",
    urlFor: (d) =>
      `https://www.google.com/search?q=${encodeURIComponent(`site:timeout.com ${d}`)}`,
  },
  {
    name: "Wikivoyage",
    icon: "📖",
    description: "Guía de viaje",
    urlFor: (d) =>
      `https://es.wikivoyage.org/w/index.php?search=${encodeURIComponent(d)}`,
  },
  {
    name: "Google Maps",
    icon: "🗺️",
    description: "Mapa y lugares",
    urlFor: (d) =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d)}`,
  },
  {
    name: "Tripadvisor",
    icon: "⭐",
    description: "Atracciones rankeadas",
    urlFor: (d) =>
      `https://www.tripadvisor.com/Search?q=${encodeURIComponent(d)}`,
  },
];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatItemTime(startAt: Date | null, endAt: Date | null) {
  if (!startAt && !endAt) return null;
  const time = (d: Date) =>
    d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const dateTime = (d: Date) => d.toLocaleString("es-AR");
  if (!startAt) return dateTime(new Date(endAt!));
  const start = new Date(startAt);
  if (!endAt) return time(start);
  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay
    ? `${time(start)} → ${time(end)}`
    : `${time(start)} → ${dateTime(end)}`;
}

type ItemRow = typeof items.$inferSelect;

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

async function joinTrip(slug: string, formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await setTraveler(name);
  revalidatePath(`/trips/${slug}`);
}

async function createDestination(slug: string, formData: FormData) {
  "use server";
  const parsed = parseSlug(slug);
  if (!parsed) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const arrivalMode = String(formData.get("arrivalMode") ?? "avion");
  const arrivalDate = String(formData.get("arrivalDate") ?? "").trim() || null;
  const departureDate =
    String(formData.get("departureDate") ?? "").trim() || null;

  const db = getDb();
  const last = await db
    .select({ orderIndex: tripDestinations.orderIndex })
    .from(tripDestinations)
    .where(eq(tripDestinations.tripId, parsed.id))
    .orderBy(desc(tripDestinations.orderIndex))
    .limit(1);
  const orderIndex = (last[0]?.orderIndex ?? -1) + 1;

  const coverImageUrl = await fetchDestinationPhoto(name);
  const traveler = await getTraveler();

  await db.insert(tripDestinations).values({
    tripId: parsed.id,
    name,
    orderIndex,
    coverImageUrl,
    arrivalMode,
    arrivalDate,
    departureDate,
    createdByName: traveler.name,
  });

  revalidatePath(`/trips/${slug}`);
}

async function deleteDestination(slug: string, destId: number) {
  "use server";
  await getDb()
    .delete(tripDestinations)
    .where(eq(tripDestinations.id, destId));
  revalidatePath(`/trips/${slug}`);
}

async function createItem(
  slug: string,
  destinationId: number,
  formData: FormData
) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  if (!name || !ITEM_KINDS.includes(kind as (typeof ITEM_KINDS)[number])) return;

  const startAtRaw = String(formData.get("startAt") ?? "").trim();
  const endAtRaw = String(formData.get("endAt") ?? "").trim();
  const costRaw = String(formData.get("cost") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const traveler = await getTraveler();

  await getDb().insert(items).values({
    destinationId,
    kind,
    name,
    startAt: startAtRaw ? new Date(startAtRaw) : null,
    endAt: endAtRaw ? new Date(endAtRaw) : null,
    cost: costRaw || null,
    link,
    notes,
    createdByName: traveler.name,
  });

  revalidatePath(`/trips/${slug}`);
}

async function deleteItem(slug: string, itemId: number) {
  "use server";
  await getDb().delete(items).where(eq(items.id, itemId));
  revalidatePath(`/trips/${slug}`);
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
  const { id: slug } = await params;
  const { view } = await searchParams;
  const activeTab: "all" | (typeof TAB_KINDS)[number] =
    view && (TAB_KINDS as readonly string[]).includes(view)
      ? (view as (typeof TAB_KINDS)[number])
      : "all";

  const parsed = parseSlug(slug);
  if (!parsed) notFound();

  const db = getDb();
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, parsed.id))
    .limit(1);
  if (!trip || trip.shareToken !== parsed.token) notFound();

  const traveler = await getTraveler();
  if (!traveler.name) {
    return <JoinPrompt tripName={trip.name} slug={slug} />;
  }

  const dests = await db
    .select()
    .from(tripDestinations)
    .where(eq(tripDestinations.tripId, parsed.id))
    .orderBy(asc(tripDestinations.orderIndex));

  const allItems: ItemRow[] =
    dests.length > 0
      ? await db
          .select()
          .from(items)
          .where(
            inArray(
              items.destinationId,
              dests.map((d) => d.id)
            )
          )
          .orderBy(asc(items.startAt), asc(items.createdAt))
      : [];

  const deleteTripBound = deleteTrip.bind(null, parsed.id);
  const createDestinationBound = createDestination.bind(null, slug);
  const tripUrl = `/trips/${slug}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between gap-3">
        <Link href="/trips" className="text-sm text-slate-500 hover:text-slate-700">
          ← Mis viajes
        </Link>
        <span className="text-xs text-slate-500">
          Hola, <strong className="text-slate-700">{traveler.name}</strong>
        </span>
      </div>

      <header className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{trip.name}</h1>
          {trip.originName && (
            <div className="mt-1 text-slate-700">
              📍 Desde <strong>{trip.originName}</strong>
            </div>
          )}
          {(trip.startDate || trip.endDate) && (
            <div className="mt-1 text-sm text-slate-500">
              {trip.startDate ?? "?"} → {trip.endDate ?? "?"}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`${tripUrl}/edit`}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Editar
          </Link>
          <ConfirmButton
            action={deleteTripBound}
            message={`¿Borrar el viaje "${trip.name}" con todos sus destinos e items? No se puede deshacer.`}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
          >
            Borrar
          </ConfirmButton>
        </div>
      </header>

      {dests.length > 0 && (
        <div className="-mx-6 mt-6 overflow-x-auto px-6">
          <div className="flex min-w-max items-center gap-2 text-sm">
            {trip.originName && (
              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 font-medium">
                📍 {trip.originName}
              </span>
            )}
            {dests.map((d) => (
              <span key={d.id} className="flex items-center gap-2">
                <span className="text-lg">
                  {TRANSPORT_ICON[
                    d.arrivalMode as (typeof TRANSPORT_MODES)[number]
                  ] ?? TRANSPORT_ICON.otro}
                </span>
                <a
                  href={`#dest-${d.id}`}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 font-medium hover:border-slate-500"
                >
                  {d.name}
                </a>
              </span>
            ))}
          </div>
        </div>
      )}

      {dests.length === 0 ? (
        <p className="mt-8 text-slate-600">
          Tu viaje todavía no tiene destinos. Sumá el primero abajo.
        </p>
      ) : (
        <div className="mt-8 space-y-12">
          {dests.map((dest, idx) => {
            const prev = idx > 0 ? dests[idx - 1] : null;
            const fromName = prev?.name ?? trip.originName ?? null;
            const arrivalMode =
              dest.arrivalMode as (typeof TRANSPORT_MODES)[number];
            const destItems = allItems.filter(
              (it) => it.destinationId === dest.id
            );
            const filteredItems =
              activeTab === "all"
                ? destItems
                : destItems.filter((it) => it.kind === activeTab);
            const deleteDestBound = deleteDestination.bind(null, slug, dest.id);
            const createItemBound = createItem.bind(null, slug, dest.id);

            return (
              <section
                key={dest.id}
                id={`dest-${dest.id}`}
                className="scroll-mt-4"
              >
                {dest.coverImageUrl ? (
                  <div className="relative h-72 overflow-hidden rounded-2xl shadow-md">
                    <img
                      src={dest.coverImageUrl}
                      alt={dest.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute right-3 top-3 flex gap-2">
                      <Link
                        href={`${tripUrl}/destinations/${dest.id}/edit`}
                        className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 backdrop-blur transition hover:bg-white"
                      >
                        Editar
                      </Link>
                      <ConfirmButton
                        action={deleteDestBound}
                        message={`¿Borrar el destino "${dest.name}" y todos sus items?`}
                        className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-red-700 backdrop-blur transition hover:bg-white"
                      >
                        Borrar
                      </ConfirmButton>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <h2 className="text-3xl font-bold drop-shadow-md">
                        {dest.name}
                      </h2>
                      {(dest.arrivalDate || dest.departureDate) && (
                        <div className="mt-1 text-sm text-white/90 drop-shadow">
                          {dest.arrivalDate ?? "?"} →{" "}
                          {dest.departureDate ?? "?"}
                        </div>
                      )}
                      {dest.createdByName && (
                        <div className="mt-1 text-xs text-white/80 drop-shadow">
                          Sumado por {dest.createdByName}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">
                        {dest.name}
                      </h2>
                      {(dest.arrivalDate || dest.departureDate) && (
                        <div className="mt-1 text-sm text-slate-500">
                          {dest.arrivalDate ?? "?"} →{" "}
                          {dest.departureDate ?? "?"}
                        </div>
                      )}
                      {dest.createdByName && (
                        <div className="mt-1 text-xs text-slate-500">
                          Sumado por {dest.createdByName}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={`${tripUrl}/destinations/${dest.id}/edit`}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Editar
                      </Link>
                      <ConfirmButton
                        action={deleteDestBound}
                        message={`¿Borrar el destino "${dest.name}" y todos sus items?`}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
                      >
                        Borrar
                      </ConfirmButton>
                    </div>
                  </div>
                )}

                {fromName && (
                  <p className="mt-3 text-sm text-slate-600">
                    Llegaste en{" "}
                    <span className="text-base">
                      {TRANSPORT_ICON[arrivalMode] ?? TRANSPORT_ICON.otro}
                    </span>{" "}
                    {TRANSPORT_LABELS[arrivalMode] ?? "Otro"} desde{" "}
                    <strong>{fromName}</strong>
                  </p>
                )}

                <section className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Recursos para {dest.name}
                  </h3>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {RESOURCES.map((r) => (
                      <a
                        key={r.name}
                        href={r.urlFor(dest.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-slate-400 hover:shadow-sm"
                      >
                        <span className="text-xl">{r.icon}</span>
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{r.name}</div>
                          <div className="text-xs text-slate-500">
                            {r.description}
                          </div>
                        </div>
                        <span className="text-slate-400" aria-hidden>
                          ↗
                        </span>
                      </a>
                    ))}
                  </div>
                </section>

                <h3 className="mt-6 text-sm font-semibold text-slate-700">
                  Items
                </h3>
                <div className="-mx-6 mt-2 overflow-x-auto px-6">
                  <div className="flex min-w-max gap-1.5 pb-1">
                    <Link
                      href={`${tripUrl}#dest-${dest.id}`}
                      scroll={false}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        activeTab === "all"
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      Todos
                    </Link>
                    {TAB_KINDS.map((k) => (
                      <Link
                        key={k}
                        href={`${tripUrl}?view=${k}#dest-${dest.id}`}
                        scroll={false}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          activeTab === k
                            ? KIND_TAB_ACTIVE[k]
                            : "border border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                        }`}
                      >
                        <span className="mr-1">{KIND_ICON[k]}</span>
                        {KIND_PLURAL[k]}
                      </Link>
                    ))}
                  </div>
                </div>

                {destItems.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    Sin items todavía. Sumá el primero abajo.
                  </p>
                ) : filteredItems.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    Sin{" "}
                    {KIND_PLURAL[
                      activeTab as (typeof TAB_KINDS)[number]
                    ].toLowerCase()}{" "}
                    en {dest.name}.
                  </p>
                ) : (
                  <div className="mt-3 space-y-5">
                    {groupByDay(filteredItems).map(({ key, label, rows }) => (
                      <div key={key}>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {label}
                        </h4>
                        <ul className="space-y-2">
                          {rows.map((it) => {
                            const kind = it.kind as (typeof ITEM_KINDS)[number];
                            const deleteItemBound = deleteItem.bind(
                              null,
                              slug,
                              it.id
                            );
                            const timeLabel = formatItemTime(
                              it.startAt,
                              it.endAt
                            );
                            return (
                              <li
                                key={it.id}
                                className={`rounded-xl border border-slate-200 border-l-4 bg-white px-4 py-3 ${
                                  KIND_BORDER[kind] ?? KIND_BORDER.otro
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <span className="font-semibold">
                                    {it.name}
                                  </span>
                                  <span
                                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      KIND_BADGE[kind] ?? KIND_BADGE.otro
                                    }`}
                                  >
                                    <span className="mr-1">
                                      {KIND_ICON[kind] ?? KIND_ICON.otro}
                                    </span>
                                    {KIND_LABELS[kind] ?? it.kind}
                                  </span>
                                </div>
                                {timeLabel && (
                                  <div className="mt-1 text-sm tabular-nums text-slate-500">
                                    {timeLabel}
                                  </div>
                                )}
                                {it.cost && (
                                  <div className="mt-1 text-sm text-slate-700">
                                    $ {it.cost}
                                  </div>
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
                                {it.createdByName && (
                                  <div className="mt-2 text-xs text-slate-500">
                                    Cargado por {it.createdByName}
                                  </div>
                                )}
                                <div className="mt-3 flex gap-2 text-sm">
                                  <Link
                                    href={`${tripUrl}/items/${it.id}/edit`}
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
                      </div>
                    ))}
                  </div>
                )}

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900">
                    + Sumar item a {dest.name}
                  </summary>
                  <form
                    action={createItemBound}
                    className="mt-3 grid max-w-lg gap-3"
                  >
                    <Field label="Tipo">
                      <select
                        name="kind"
                        required
                        defaultValue="vuelo"
                        className={inputCls}
                      >
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
                        placeholder="AA1234 BUE→FCO"
                        className={inputCls}
                      />
                    </Field>
                    <div className="flex gap-3">
                      <Field label="Desde" className="flex-1">
                        <input
                          name="startAt"
                          type="datetime-local"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Hasta" className="flex-1">
                        <input
                          name="endAt"
                          type="datetime-local"
                          className={inputCls}
                        />
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
                      <input
                        name="link"
                        type="url"
                        placeholder="https://..."
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Notas">
                      <textarea
                        name="notes"
                        rows={3}
                        className={`${inputCls} resize-y`}
                      />
                    </Field>
                    <button type="submit" className={submitBtnCls}>
                      Guardar item
                    </button>
                  </form>
                </details>
              </section>
            );
          })}
        </div>
      )}

      <section className="mt-12 rounded-xl border border-dashed border-slate-300 bg-white/60 p-5">
        <h2 className="text-lg font-semibold">
          {dests.length === 0 ? "Primer destino" : "Sumar otro destino"}
        </h2>
        <form action={createDestinationBound} className="mt-3 grid max-w-md gap-3">
          <Field label="Nombre">
            <input
              name="name"
              required
              placeholder="Roma"
              className={inputCls}
            />
          </Field>
          <Field
            label={
              dests.length === 0
                ? `Cómo llegás desde ${trip.originName ?? "el origen"}`
                : `Cómo llegás desde ${dests[dests.length - 1].name}`
            }
          >
            <select
              name="arrivalMode"
              required
              defaultValue="avion"
              className={inputCls}
            >
              {TRANSPORT_MODES.map((m) => (
                <option key={m} value={m}>
                  {TRANSPORT_ICON[m]}  {TRANSPORT_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex gap-3">
            <Field label="Llegada" className="flex-1">
              <input name="arrivalDate" type="date" className={inputCls} />
            </Field>
            <Field label="Salida" className="flex-1">
              <input name="departureDate" type="date" className={inputCls} />
            </Field>
          </div>
          <button type="submit" className={submitBtnCls}>
            Guardar destino
          </button>
        </form>
      </section>

      <section className="mt-10 rounded-xl border border-slate-200 bg-white/70 p-5">
        <h3 className="text-sm font-semibold text-slate-700">
          Compartir este viaje
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Pasale este link a los que viajan con vos. Cuando entren se les pide
          el nombre y pueden cargar/editar todo.
        </p>
        <code className="mt-2 block break-all rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
          {/* On the server we don't know the host. Show the relative path; the
              user copies the full URL from the address bar. */}
          {tripUrl}
        </code>
      </section>
    </main>
  );
}

function JoinPrompt({ tripName, slug }: { tripName: string; slug: string }) {
  const joinBound = joinTrip.bind(null, slug);
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Te invitaron a un viaje</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{tripName}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Decinos cómo te llamás para que el grupo sepa qué cargás vos.
        </p>
        <form action={joinBound} className="mt-5 grid gap-3">
          <Field label="Tu nombre">
            <input
              name="name"
              required
              autoFocus
              placeholder="Belén"
              className={inputCls}
            />
          </Field>
          <button type="submit" className={submitBtnCls}>
            Entrar al viaje
          </button>
        </form>
      </div>
    </main>
  );
}
