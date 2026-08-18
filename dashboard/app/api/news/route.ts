export type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  content: string;
  source: string;
  image: string;
  author: string;
};

const FEEDS: Record<string, { url: string; source: string }[]> = {
  ai: [
    // Google News searches per company — free, no API key
    { url: "https://news.google.com/rss/search?q=Anthropic+Claude&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
    { url: "https://news.google.com/rss/search?q=OpenAI+ChatGPT+GPT&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
    { url: "https://news.google.com/rss/search?q=Kimi+Moonshot+AI+model&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
    // Image-rich sources to fill the grid
    { url: "https://techcrunch.com/category/artificial-intelligence/feed/", source: "TechCrunch" },
    { url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", source: "The Verge" },
    { url: "https://venturebeat.com/category/ai/feed/", source: "VentureBeat" },
  ],
  soccer: [
    { url: "https://news.google.com/rss/search?q=World+Cup+2026+soccer&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
    { url: "https://feeds.bbci.co.uk/sport/football/rss.xml", source: "BBC Sport" },
    { url: "https://www.theguardian.com/football/rss", source: "The Guardian" },
    { url: "https://www.reddit.com/r/worldcup+soccer/.rss?limit=15", source: "Reddit" },
    { url: "https://www.90min.com/feed", source: "90min" },
    { url: "https://www.fourfourtwo.com/rss", source: "FourFourTwo" },
  ],
  nba: [
    { url: "https://news.google.com/rss/search?q=NBA+basketball+2026&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
    { url: "https://www.espn.com/espn/rss/nba/news", source: "ESPN" },
    { url: "https://www.theguardian.com/sport/nba/rss", source: "The Guardian" },
    { url: "https://www.reddit.com/r/nba/.rss?limit=15", source: "Reddit" },
    { url: "https://bleacherreport.com/nba.rss", source: "Bleacher Report" },
  ],
  ufc: [
    { url: "https://news.google.com/rss/search?q=UFC+fight+results+2026&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
    { url: "https://news.google.com/rss/search?q=UFC+Jon+Jones+Islam+Makhachev+Dricus+du+Plessis&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
    { url: "https://news.google.com/rss/search?q=UFC+next+event+card+fighter&hl=en-US&gl=US&ceid=US:en", source: "Google News" },
    { url: "https://www.espn.com/espn/rss/mma/news", source: "ESPN" },
    { url: "https://www.mmafighting.com/rss/current", source: "MMA Fighting" },
    { url: "https://mmajunkie.usatoday.com/feed", source: "MMA Junkie" },
    { url: "https://www.reddit.com/r/ufc+MMA/.rss?limit=15", source: "Reddit" },
  ],
  colombia: [
    { url: "https://news.google.com/rss/search?q=Colombia+noticias&hl=es-419&gl=CO&ceid=CO:es-419", source: "Google News" },
    { url: "https://caracol.com.co/feed/", source: "Caracol" },
    { url: "https://www.rcnradio.com/feed", source: "RCN Radio" },
    { url: "https://www.eltiempo.com/rss/colombia.xml", source: "El Tiempo" },
    { url: "https://www.semana.com/rss/", source: "Semana" },
    { url: "https://www.elespectador.com/arc/outboundfeeds/rss/", source: "El Espectador" },
  ],
  nyt: [
    { url: "https://news.google.com/rss/search?q=site:nytimes.com+world&hl=en-US&gl=US&ceid=US:en", source: "NY Times" },
    { url: "https://news.google.com/rss/search?q=site:nytimes.com+politics+US&hl=en-US&gl=US&ceid=US:en", source: "NY Times" },
    { url: "https://news.google.com/rss/search?q=site:nytimes.com+technology&hl=en-US&gl=US&ceid=US:en", source: "NY Times" },
    { url: "https://news.google.com/rss/search?q=site:nytimes.com+business+economy&hl=en-US&gl=US&ceid=US:en", source: "NY Times" },
    { url: "https://news.google.com/rss/search?q=site:nytimes.com+science+health&hl=en-US&gl=US&ceid=US:en", source: "NY Times" },
  ],
};

export function cleanText(raw: string): string {
  // Pass 1 — strip tags that are already in plain HTML
  let t = raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|li|div|tr)>/gi, " ")
    .replace(/<[^>]*>/g, "");

  // Decode entities (some feeds escape HTML as &lt;a&gt; instead of using CDATA)
  t = t
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#\d+;/g, " ");

  // Pass 2 — strip any tags that were hiding behind entities
  t = t.replace(/<[^>]*>/g, "");

  return t
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractTag(xml: string, tag: string): string {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdata) return cdata[1].trim();
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (plain) return plain[1].trim();
  return "";
}

export function extractLink(xml: string): string {
  const atom = xml.match(/<link[^>]+href="([^"]+)"/i);
  if (atom) return atom[1];
  const fb = xml.match(/<feedburner:origLink>([^<]+)<\/feedburner:origLink>/i);
  if (fb) return fb[1].trim();
  const std = xml.match(/<link>([^<\s][^<]*)<\/link>/i) || xml.match(/<link>\s*([^\s<][^<]*)/i);
  if (std) return std[1].trim();
  const guid = xml.match(/<guid[^>]*>([^<]+)<\/guid>/i);
  if (guid && guid[1].startsWith("http")) return guid[1].trim();
  return "";
}

export function extractImage(xml: string): string {
  const media = xml.match(/<media:content[^>]+url="([^"]+)"/i);
  if (media) return media[1];
  const thumb = xml.match(/<media:thumbnail[^>]+url="([^"]+)"/i);
  if (thumb) return thumb[1];
  const encl = xml.match(/<enclosure[^>]+url="([^"]+)"[^>]+type="image/i);
  if (encl) return encl[1];
  const img = xml.match(/<img[^>]+src="([^"]+)"/i);
  if (img && img[1].startsWith("http")) return img[1];
  return "";
}

export function parseItems(xml: string, feedSource: string): NewsItem[] {
  const items: NewsItem[] = [];
  const regex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = regex.exec(xml)) !== null && items.length < 8) {
    const block = m[1];

    const rssSource = extractTag(block, "source");
    const source = rssSource || feedSource;

    let title = cleanText(extractTag(block, "title"));
    if (!title || title.startsWith("http")) continue;
    if (rssSource && title.endsWith(` - ${rssSource}`)) {
      title = title.slice(0, -(rssSource.length + 3));
    }

    const link = extractLink(block);
    const pubDate = extractTag(block, "pubDate");
    const rawDesc = extractTag(block, "description");
    const rawContent = extractTag(block, "content:encoded") || extractTag(block, "content");

    const description = cleanText(rawDesc).slice(0, 220);
    const content = rawContent
      ? cleanText(rawContent.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n")).slice(0, 3000)
      : description;
    const image = extractImage(block) || extractImage(rawContent || rawDesc);
    const author = cleanText(
      extractTag(block, "dc:creator") || extractTag(block, "author")
    ).replace(/^by\s+/i, "");

    items.push({ title, link, pubDate, description, content, source, image, author });
  }
  return items;
}

// Shared fetcher — used by this route AND the news-digest route (direct call,
// no internal HTTP fetch, which Cloudflare Access would otherwise block).
export async function getNewsItems(params: URLSearchParams): Promise<NewsItem[]> {
  const category = params.get("category") ?? "ai";

  let feeds: { url: string; source: string }[];

  if (category === "custom") {
    const topic = params.get("topic");
    const feedUrl = params.get("url");
    if (topic) {
      feeds = [{ url: `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`, source: "Google News" }];
    } else if (feedUrl) {
      feeds = [{ url: feedUrl, source: "Custom Feed" }];
    } else {
      return [];
    }
  } else {
    feeds = FEEDS[category] ?? FEEDS.ai;
  }

  // Fetch all feeds in parallel, collecting results as they arrive. Each feed
  // never rejects (empty on error/timeout), and the whole thing is capped by an
  // overall deadline — so one slow feed can't stall the response.
  const collected: NewsItem[] = [];
  const feedJobs = feeds.map(({ url: feedUrl, source }) =>
    fetch(feedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; n2s-dashboard/1.0)" },
      signal: AbortSignal.timeout(4000),
    })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(`${res.status}`))))
      .then((xml) => { collected.push(...parseItems(xml, source)); })
      .catch(() => { /* skip this feed */ })
  );

  // Return as soon as every feed settles OR after 4.5s — whichever comes first.
  await Promise.race([
    Promise.allSettled(feedJobs),
    new Promise((resolve) => setTimeout(resolve, 4500)),
  ]);

  const seen = new Set<string>();
  return collected
    .filter((item) => {
      const key = item.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const items = await getNewsItems(url.searchParams);
  return Response.json({ items }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
