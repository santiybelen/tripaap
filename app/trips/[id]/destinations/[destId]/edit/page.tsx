import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../../lib/db";
import {
  trips,
  tripDestinations,
  TRANSPORT_MODES,
} from "../../../../../../drizzle/schema";
import {
  Field,
  inputCls,
  submitBtnCls,
} from "../../../../../_components/form-bits";
import {
  TRANSPORT_LABELS,
  TRANSPORT_ICON,
} from "../../../../../../lib/transport-modes";
import { fetchDestinationPhoto } from "../../../../../../lib/destination-photo";
import { parseSlug } from "../../../../../../lib/trip-slug";

export const dynamic = "force-dynamic";

async function updateDestination(
  slug: string,
  destId: number,
  formData: FormData
) {
  "use server";
  const parsed = parseSlug(slug);
  if (!parsed) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const arrivalMode = String(formData.get("arrivalMode") ?? "avion");
  const arrivalDate = String(formData.get("arrivalDate") ?? "").trim() || null;
  const departureDate =
    String(formData.get("departureDate") ?? "").trim() || null;

  const coverImageUrl = await fetchDestinationPhoto(name);

  await getDb()
    .update(tripDestinations)
    .set({
      name,
      arrivalMode,
      arrivalDate,
      departureDate,
      coverImageUrl,
    })
    .where(eq(tripDestinations.id, destId));

  revalidatePath(`/trips/${slug}`);
  redirect(`/trips/${slug}`);
}

export default async function EditDestinationPage({
  params,
}: {
  params: Promise<{ id: string; destId: string }>;
}) {
  const { id: slug, destId } = await params;
  const parsed = parseSlug(slug);
  const destIdNum = Number(destId);
  if (!parsed || !Number.isFinite(destIdNum)) notFound();

  const db = getDb();
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, parsed.id))
    .limit(1);
  if (!trip || trip.shareToken !== parsed.token) notFound();

  const [dest] = await db
    .select()
    .from(tripDestinations)
    .where(
      and(
        eq(tripDestinations.id, destIdNum),
        eq(tripDestinations.tripId, parsed.id)
      )
    )
    .limit(1);
  if (!dest) notFound();

  const updateDestBound = updateDestination.bind(null, slug, destIdNum);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/trips/${slug}`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Volver al viaje
      </Link>

      <h1 className="mt-2 text-3xl font-bold tracking-tight">Editar destino</h1>

      <form action={updateDestBound} className="mt-6 grid max-w-md gap-3">
        <Field label="Nombre">
          <input
            name="name"
            required
            defaultValue={dest.name}
            className={inputCls}
          />
        </Field>
        <Field label="Cómo llegás">
          <select
            name="arrivalMode"
            required
            defaultValue={dest.arrivalMode}
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
            <input
              name="arrivalDate"
              type="date"
              defaultValue={dest.arrivalDate ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Salida" className="flex-1">
            <input
              name="departureDate"
              type="date"
              defaultValue={dest.departureDate ?? ""}
              className={inputCls}
            />
          </Field>
        </div>
        <button type="submit" className={submitBtnCls}>
          Guardar cambios
        </button>
      </form>
    </main>
  );
}
