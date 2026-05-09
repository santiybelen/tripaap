function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    );
}

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function fetchPageTitle(url: string): Promise<string | null> {
  if (!/^https?:\/\//i.test(url)) return null;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 200_000);

    const og =
      html.match(
        /<meta\s+[^>]*?property=["']og:title["'][^>]*?content=["']([^"']+)["']/i
      ) ??
      html.match(
        /<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?property=["']og:title["']/i
      );
    if (og) return decodeEntities(og[1]).trim() || null;

    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (title) return decodeEntities(title[1]).trim() || null;

    return null;
  } catch {
    return null;
  }
}
