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
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Inicio
        </Link>
      </div>

      <h1 className="mt-2 text-3xl font-bold tracking-tight">Mis viajes</h1>

      {loadError ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error al leer la DB: <code className="font-mono">{loadError}</code>
        </p>
      ) : allTrips.length === 0 ? (
        <p className="mt-6 text-slate-600">
          No hay viajes todavía. Sumá el primero abajo.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {allTrips.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trips/${t.id}`}
                className="block rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-400 hover:shadow-sm"
              >
                <div className="font-semibold">{t.name}</div>
                {t.destination && (
                  <div className="text-sm text-slate-600">{t.destination}</div>
                )}
                {(t.startDate || t.endDate) && (
                  <div className="mt-0.5 text-xs text-slate-500">
                    {t.startDate ?? "?"} → {t.endDate ?? "?"}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 text-lg font-semibold">Nuevo viaje</h2>
      <form action={createTrip} className="mt-3 grid max-w-md gap-3">
        <Field label="Nombre">
          <input
            name="name"
            required
            placeholder="Bariloche octubre"
            className={inputCls}
          />
        </Field>
        <Field label="Destino">
          <input
            name="destination"
            placeholder="Bariloche, AR"
            className={inputCls}
          />
        </Field>
        <div className="flex gap-3">
          <Field label="Desde" className="flex-1">
            <input name="startDate" type="date" className={inputCls} />
          </Field>
          <Field label="Hasta" className="flex-1">
            <input name="endDate" type="date" className={inputCls} />
          </Field>
        </div>
        <button
          type="submit"
          className="mt-1 rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-slate-800"
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

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1 block text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";
