import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../lib/db";
import {
  trips,
  items,
  tripDestinations,
  ITEM_KINDS,
} from "../../../../../../drizzle/schema";
import {
  Field,
  inputCls,
  submitBtnCls,
  toLocalDatetime,
} from "../../../../../_components/form-bits";
import {
  KIND_LABELS,
  KIND_ICON,
} from "../../../../../../lib/item-kinds";
import { parseSlug } from "../../../../../../lib/trip-slug";

export const dynamic = "force-dynamic";

async function updateItem(
  slug: string,
  itemId: number,
  formData: FormData
) {
  "use server";
  const parsed = parseSlug(slug);
  if (!parsed) return;

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  if (!name || !ITEM_KINDS.includes(kind as (typeof ITEM_KINDS)[number])) return;

  const startAtRaw = String(formData.get("startAt") ?? "").trim();
  const endAtRaw = String(formData.get("endAt") ?? "").trim();
  const costRaw = String(formData.get("cost") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await getDb()
    .update(items)
    .set({
      kind,
      name,
      startAt: startAtRaw ? new Date(startAtRaw) : null,
      endAt: endAtRaw ? new Date(endAtRaw) : null,
      cost: costRaw || null,
      link,
      notes,
    })
    .where(eq(items.id, itemId));

  revalidatePath(`/trips/${slug}`);
  redirect(`/trips/${slug}`);
}

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id: slug, itemId } = await params;
  const parsed = parseSlug(slug);
  const itemIdNum = Number(itemId);
  if (!parsed || !Number.isFinite(itemIdNum)) notFound();

  const db = getDb();
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, parsed.id))
    .limit(1);
  if (!trip || trip.shareToken !== parsed.token) notFound();

  const [item] = await db
    .select()
    .from(items)
    .where(eq(items.id, itemIdNum))
    .limit(1);
  if (!item) notFound();

  const [dest] = await db
    .select()
    .from(tripDestinations)
    .where(eq(tripDestinations.id, item.destinationId))
    .limit(1);
  if (!dest || dest.tripId !== parsed.id) notFound();

  const updateItemBound = updateItem.bind(null, slug, itemIdNum);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/trips/${slug}`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Volver al viaje
      </Link>

      <h1 className="mt-2 text-3xl font-bold tracking-tight">Editar item</h1>
      <p className="mt-1 text-sm text-slate-600">
        Item de <strong>{dest.name}</strong>
      </p>

      <form action={updateItemBound} className="mt-6 grid max-w-lg gap-3">
        <Field label="Tipo">
          <select
            name="kind"
            required
            defaultValue={item.kind}
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
            defaultValue={item.name}
            className={inputCls}
          />
        </Field>
        <div className="flex gap-3">
          <Field label="Desde" className="flex-1">
            <input
              name="startAt"
              type="datetime-local"
              defaultValue={toLocalDatetime(item.startAt)}
              className={inputCls}
            />
          </Field>
          <Field label="Hasta" className="flex-1">
            <input
              name="endAt"
              type="datetime-local"
              defaultValue={toLocalDatetime(item.endAt)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Costo">
          <input
            name="cost"
            type="number"
            step="0.01"
            defaultValue={item.cost ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Link (booking, mail, etc.)">
          <input
            name="link"
            type="url"
            defaultValue={item.link ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Notas">
          <textarea
            name="notes"
            rows={3}
            defaultValue={item.notes ?? ""}
            className={`${inputCls} resize-y`}
          />
        </Field>
        <button type="submit" className={submitBtnCls}>
          Guardar cambios
        </button>
      </form>
    </main>
  );
}
