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

// Digest cache — the AI summary is expensive to generate, so remember it for
// the session and paint it instantly on reload while revalidating.
const DIGEST_PREFIX = "n2s_digest_cache:";

export function readDigestCache(key: string): string | null {
  try {
    return sessionStorage.getItem(DIGEST_PREFIX + key);
  } catch {
    return null;
  }
}

export function writeDigestCache(key: string, summary: string) {
  try {
    sessionStorage.setItem(DIGEST_PREFIX + key, summary);
  } catch {
    /* ignore */
  }
}
