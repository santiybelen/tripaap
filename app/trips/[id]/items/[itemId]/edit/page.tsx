import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../../lib/db";
import { items, ITEM_KINDS } from "../../../../../../drizzle/schema";
import {
  Field,
  inputCls,
  submitBtnCls,
  toLocalDatetime,
} from "../../../../../_components/form-bits";
import { KIND_LABELS, KIND_ICON } from "../../../../../../lib/item-kinds";

export const dynamic = "force-dynamic";

async function updateItem(
  itemId: number,
  tripId: number,
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

  revalidatePath(`/trips/${tripId}`);
  redirect(`/trips/${tripId}`);
}

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  const tripId = Number(id);
  const itemIdNum = Number(itemId);
  if (!Number.isFinite(tripId) || !Number.isFinite(itemIdNum)) notFound();

  const [item] = await getDb()
    .select()
    .from(items)
    .where(and(eq(items.id, itemIdNum), eq(items.tripId, tripId)))
    .limit(1);
  if (!item) notFound();

  const updateItemBound = updateItem.bind(null, itemIdNum, tripId);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/trips/${tripId}`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← Volver al viaje
      </Link>

      <h1 className="mt-2 text-3xl font-bold tracking-tight">Editar item</h1>

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
