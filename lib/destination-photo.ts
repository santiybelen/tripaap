export async function fetchDestinationPhoto(
  destination: string
): Promise<string | null> {
  const trimmed = destination.trim();
  if (!trimmed) return null;

  const main = trimmed.split(",")[0].trim();
  if (!main) return null;

  try {
    const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(main)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Tripaap/0.1 (https://github.com/santiybelen/tripaap)" },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const data: {
      originalimage?: { source?: string };
      thumbnail?: { source?: string };
    } = await res.json();
    return data.originalimage?.source ?? data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}
