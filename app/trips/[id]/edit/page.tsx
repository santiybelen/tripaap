import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../lib/db";
import { trips } from "../../../../drizzle/schema";
import { Field, inputCls, submitBtnCls } from "../../../_components/form-bits";
import { parseSlug } from "../../../../lib/trip-slug";

export const dynamic = "force-dynamic";

async function updateTrip(slug: string, formData: FormData) {
  "use server";
  const parsed = parseSlug(slug);
  if (!parsed) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const originName = String(formData.get("originName") ?? "").trim() || null;
  const startDate = String(formData.get("startDate") ?? "").trim() || null;
  const endDate = String(formData.get("endDate") ?? "").trim() || null;

  await getDb()
    .update(trips)
    .set({ name, originName, startDate, endDate })
    .where(eq(trips.id, parsed.id));

  revalidatePath(`/trips/${slug}`);
  redirect(`/trips/${slug}`);
}

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) notFound();

  const [trip] = await getDb()
    .select()
    .from(trips)
    .where(eq(trips.id, parsed.id))
    .limit(1);
  if (!trip || trip.shareToken !== parsed.token) notFound();

  const updateTripBound = updateTrip.bind(null, slug);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/trips/${slug}`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Volver al viaje
      </Link>

      <h1 className="mt-2 text-3xl font-bold tracking-tight">Editar viaje</h1>
      <p className="mt-1 text-sm text-slate-600">
        Para sumar, editar o borrar destinos, volvé al viaje.
      </p>

      <form action={updateTripBound} className="mt-6 grid max-w-md gap-3">
        <Field label="Nombre">
          <input
            name="name"
            required
            defaultValue={trip.name}
            className={inputCls}
          />
        </Field>
        <Field label="Salgo desde (origen)">
          <input
            name="originName"
            defaultValue={trip.originName ?? ""}
            className={inputCls}
          />
        </Field>
        <div className="flex gap-3">
          <Field label="Desde" className="flex-1">
            <input
              name="startDate"
              type="date"
              defaultValue={trip.startDate ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Hasta" className="flex-1">
            <input
              name="endDate"
              type="date"
              defaultValue={trip.endDate ?? ""}
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
