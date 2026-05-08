import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../lib/db";
import { trips, items, ITEM_KINDS } from "../../../drizzle/schema";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<(typeof ITEM_KINDS)[number], string> = {
  vuelo: "Vuelo",
  hotel: "Hotel",
  auto: "Auto",
  excursion: "Excursión",
  restaurante: "Restaurante",
  otro: "Otro",
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

  const createItemBound = createItem.bind(null, tripId);

  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "3rem 1.5rem",
        maxWidth: "720px",
        margin: "0 auto",
        lineHeight: 1.6,
      }}
    >
      <Link href="/trips" style={{ color: "#666", fontSize: "0.9rem", textDecoration: "none" }}>
        ← Todos los viajes
      </Link>

      <h1 style={{ fontSize: "2rem", marginTop: "0.5rem", marginBottom: "0.25rem" }}>
        {trip.name}
      </h1>
      {trip.destination && (
        <div style={{ color: "#444" }}>{trip.destination}</div>
      )}
      {(trip.startDate || trip.endDate) && (
        <div style={{ color: "#666", fontSize: "0.9rem" }}>
          {trip.startDate ?? "?"} → {trip.endDate ?? "?"}
        </div>
      )}

      <h2 style={{ fontSize: "1.25rem", marginTop: "2rem" }}>Items</h2>
      {tripItems.length === 0 ? (
        <p style={{ color: "#666" }}>Todavía no hay items. Sumá el primero abajo.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {tripItems.map((it) => (
            <li
              key={it.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: "0.75rem 1rem",
                marginBottom: "0.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <span style={{ fontWeight: 600 }}>{it.name}</span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    background: "#eee",
                    color: "#333",
                    padding: "0.1rem 0.5rem",
                    borderRadius: 999,
                    alignSelf: "center",
                  }}
                >
                  {KIND_LABELS[it.kind as (typeof ITEM_KINDS)[number]] ?? it.kind}
                </span>
              </div>
              {(it.startAt || it.endAt) && (
                <div style={{ color: "#666", fontSize: "0.85rem" }}>
                  {it.startAt ? new Date(it.startAt).toLocaleString("es-AR") : "?"}
                  {it.endAt && ` → ${new Date(it.endAt).toLocaleString("es-AR")}`}
                </div>
              )}
              {it.cost && (
                <div style={{ color: "#444", fontSize: "0.9rem" }}>$ {it.cost}</div>
              )}
              {it.link && (
                <div style={{ fontSize: "0.85rem" }}>
                  <a href={it.link} target="_blank" rel="noopener noreferrer">
                    {it.link}
                  </a>
                </div>
              )}
              {it.notes && (
                <div style={{ color: "#555", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                  {it.notes}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: "1.25rem", marginTop: "2rem" }}>Nuevo item</h2>
      <form action={createItemBound} style={{ display: "grid", gap: "0.5rem", maxWidth: 480 }}>
        <label>
          Tipo
          <select name="kind" required defaultValue="vuelo" style={inputStyle}>
            {ITEM_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nombre
          <input name="name" required placeholder="AA1234 BUE→BRC" style={inputStyle} />
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <label style={{ flex: 1 }}>
            Desde
            <input name="startAt" type="datetime-local" style={inputStyle} />
          </label>
          <label style={{ flex: 1 }}>
            Hasta
            <input name="endAt" type="datetime-local" style={inputStyle} />
          </label>
        </div>
        <label>
          Costo
          <input
            name="cost"
            type="number"
            step="0.01"
            placeholder="0.00"
            style={inputStyle}
          />
        </label>
        <label>
          Link (booking, mail, etc.)
          <input name="link" type="url" placeholder="https://..." style={inputStyle} />
        </label>
        <label>
          Notas
          <textarea name="notes" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </label>
        <button
          type="submit"
          style={{
            marginTop: "0.5rem",
            padding: "0.6rem 1rem",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Guardar item
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.5rem 0.6rem",
  marginTop: "0.25rem",
  border: "1px solid #ccc",
  borderRadius: 6,
  fontSize: "1rem",
  fontFamily: "inherit",
};
