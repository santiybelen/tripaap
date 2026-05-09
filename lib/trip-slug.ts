export function parseSlug(
  slug: string
): { id: number; token: string } | null {
  const m = slug.match(/^(\d+)-(.+)$/);
  if (!m) return null;
  const id = Number(m[1]);
  if (!Number.isFinite(id)) return null;
  return { id, token: m[2] };
}

export function buildSlug(id: number, token: string): string {
  return `${id}-${token}`;
}
