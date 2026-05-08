import Link from "next/link";
import { revalidatePath } from "next/cache";
import { desc } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { trips } from "../../drizzle/schema";

export const dynamic = "force-dynamic";

async function createTrip(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const destination = String(formData.get("destination") ?? "").trim() || null;
  const startDate = String(formData.get("startDate") ?? "").trim() || null;
  const endDate = String(formData.get("endDate") ?? "").trim() || null;

  await getDb().insert(trips).values({
    name,
    destination,
    startDate,
    endDate,
  });

  revalidatePath("/trips");
}

export default async function TripsPage() {
  let allTrips: Awaited<ReturnType<typeof loadTrips>> = [];
  let loadError: string | null = null;

  try {
    allTrips = await loadTrips();
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err);
  }

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
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Trips</h1>

      {loadError ? (
        <p style={{ color: "#b00" }}>
          Error al leer la DB: <code>{loadError}</code>
        </p>
      ) : allTrips.length === 0 ? (
        <p style={{ color: "#666" }}>No hay viajes todavía. Sumá el primero abajo.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {allTrips.map((t) => (
            <li key={t.id} style={{ marginBottom: "0.5rem" }}>
              <Link
                href={`/trips/${t.id}`}
                style={{
                  display: "block",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "0.75rem 1rem",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ fontWeight: 600 }}>{t.name}</div>
                {t.destination && (
                  <div style={{ color: "#444", fontSize: "0.9rem" }}>{t.destination}</div>
                )}
                {(t.startDate || t.endDate) && (
                  <div style={{ color: "#666", fontSize: "0.85rem" }}>
                    {t.startDate ?? "?"} → {t.endDate ?? "?"}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: "1.25rem", marginTop: "2rem" }}>Nuevo viaje</h2>
      <form
        action={createTrip}
        style={{ display: "grid", gap: "0.5rem", maxWidth: 420 }}
      >
        <label>
          Nombre
          <input
            name="name"
            required
            placeholder="Bariloche octubre"
            style={inputStyle}
          />
        </label>
        <label>
          Destino
          <input name="destination" placeholder="Bariloche, AR" style={inputStyle} />
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <label style={{ flex: 1 }}>
            Desde
            <input name="startDate" type="date" style={inputStyle} />
          </label>
          <label style={{ flex: 1 }}>
            Hasta
            <input name="endDate" type="date" style={inputStyle} />
          </label>
        </div>
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
          Guardar viaje
        </button>
      </form>
    </main>
  );
}

async function loadTrips() {
  return getDb().select().from(trips).orderBy(desc(trips.createdAt));
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.5rem 0.6rem",
  marginTop: "0.25rem",
  border: "1px solid #ccc",
  borderRadius: 6,
  fontSize: "1rem",
};
