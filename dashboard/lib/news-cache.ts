// Instant paint on reload / tab switch: keep the last-fetched news items per
// category in sessionStorage, show them immediately, then revalidate in the
// background. This does NOT change images or sources — same items, just cached
// so the page doesn't flash a spinner every time.

const PREFIX = "n2s_news_cache:";

type NewsItem = unknown;

export function readNewsCache(key: string): NewsItem[] | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { items: NewsItem[] };
    return Array.isArray(parsed.items) ? parsed.items : null;
  } catch {
    return null;
  }
}

export function writeNewsCache(key: string, items: NewsItem[]) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ items, t: Date.now() }));
  } catch {
    /* quota / unavailable — ignore */
  }
}
