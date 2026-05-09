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

export async function fetchPageTitle(url: string): Promise<string | null> {
  if (!/^https?:\/\//i.test(url)) return null;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Tripaap/0.1; +https://github.com/santiybelen/tripaap)",
        Accept: "text/html,application/xhtml+xml",
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
