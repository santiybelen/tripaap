import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb } from "../../lib/db";
import { trips } from "../../drizzle/schema";
import { Field, inputCls, submitBtnCls } from "../_components/form-bits";
import { buildSlug } from "../../lib/trip-slug";

export const dynamic = "force-dynamic";

function generateShareToken(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

async function createTrip(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const originName = String(formData.get("originName") ?? "").trim() || null;
  const startDate = String(formData.get("startDate") ?? "").trim() || null;
  const endDate = String(formData.get("endDate") ?? "").trim() || null;
  const shareToken = generateShareToken();

  const [created] = await getDb()
    .insert(trips)
    .values({ name, originName, startDate, endDate, shareToken })
    .returning({ id: trips.id, shareToken: trips.shareToken });

  revalidatePath("/trips");
  redirect(`/trips/${buildSlug(created.id, created.shareToken)}`);
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
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
        ← Inicio
      </Link>

      <h1 className="mt-2 bg-gradient-to-r from-sky-700 via-violet-700 to-rose-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
        Mis viajes
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Si te compartieron un viaje, abrí el link directamente. Acá creás los
        tuyos.
      </p>

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
                href={`/trips/${buildSlug(t.id, t.shareToken)}`}
                className="block rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:-translate-y-px hover:border-slate-400 hover:shadow-md"
              >
                <div className="font-semibold">{t.name}</div>
                {t.originName && (
                  <div className="text-sm text-slate-600">
                    📍 Desde {t.originName}
                  </div>
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
            placeholder="Europa octubre"
            className={inputCls}
          />
        </Field>
        <Field label="Salgo desde (origen)">
          <input
            name="originName"
            placeholder="Buenos Aires"
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
        <button type="submit" className={submitBtnCls}>
          Crear viaje
        </button>
      </form>
    </main>
  );
}

async function loadTrips() {
  return getDb().select().from(trips).orderBy(desc(trips.createdAt));
}
