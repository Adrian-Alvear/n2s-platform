// Remembers the REAL cover image URL we resolved for an article (from its RSS
// item or its og:image), keyed by the article link. This does not change or
// generate images — it just avoids re-discovering the same real image on every
// reload, so the browser can paint it instantly from its own cache.

const KEY = "n2s_cover_cache";
const TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX = 300;

type Entry = { url: string; t: number };
type Cache = Record<string, Entry>;

function read(): Cache {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function write(c: Cache) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* quota / unavailable — ignore */
  }
}

export function getCover(link: string): string {
  if (!link) return "";
  const c = read();
  const e = c[link];
  if (e && Date.now() - e.t < TTL) return e.url;
  return "";
}

export function setCover(link: string, url: string) {
  if (!link || !url) return;
  const c = read();
  c[link] = { url, t: Date.now() };
  const keys = Object.keys(c);
  if (keys.length > MAX) {
    // drop the oldest entries
    keys
      .sort((a, b) => c[a].t - c[b].t)
      .slice(0, keys.length - MAX)
      .forEach((k) => delete c[k]);
  }
  write(c);
}
