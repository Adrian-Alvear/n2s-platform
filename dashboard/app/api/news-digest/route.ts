import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getNewsItems } from "../news/route";

// Fast/cheapest model — plenty for a short summary
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

type NewsItem = { title: string; description?: string };
interface AIResult {
  response?: string;
}
interface WorkersAI {
  run(
    model: string,
    input: { messages: { role: string; content: string }[]; max_tokens?: number; temperature?: number }
  ): Promise<AIResult>;
}

const LABELS: Record<string, string> = {
  ai: "AI & technology",
  soccer: "soccer",
  nba: "NBA",
  ufc: "UFC / MMA",
  colombia: "Colombia",
  nyt: "world",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? "ai";
  const label = LABELS[category] ?? "news";

  // Fetch feeds directly (not via internal HTTP — Cloudflare Access blocks that)
  let items: NewsItem[] = [];
  try {
    items = await getNewsItems(url.searchParams);
  } catch {
    return Response.json({ summary: "" });
  }

  const top = items.slice(0, 10);
  if (top.length === 0) return Response.json({ summary: "" });

  // Reach the Workers AI binding
  let env: { AI?: WorkersAI };
  try {
    ({ env } = getCloudflareContext() as unknown as { env: { AI?: WorkersAI } });
  } catch {
    env = {};
  }
  if (!env.AI) return Response.json({ summary: "" });

  const list = top
    .map((it, i) => `${i + 1}. ${it.title}${it.description ? ` — ${it.description}` : ""}`)
    .join("\n");

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        {
          role: "system",
          content:
            "You are a concise news editor. Summarize the day's news as 3 to 4 short bullet points. " +
            "Each bullet is ONE short, plain sentence capturing a key theme or story — group related " +
            "headlines together. Start every bullet with '- '. No title, no intro, no closing line.",
        },
        {
          role: "user",
          content: `Summarize today's top ${label} news for a busy reader:\n\n${list}`,
        },
      ],
      max_tokens: 220,
    });

    const summary = (result.response ?? "").trim();
    return Response.json(
      { summary },
      { headers: { "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400" } }
    );
  } catch {
    return Response.json({ summary: "" });
  }
}
