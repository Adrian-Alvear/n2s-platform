import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSoccerScores, type MatchEvent } from "../soccer-scores/route";
import { getUpcomingUfc, type UFCEvent } from "../ufc-events/route";

// @cloudflare/workers-types isn't installed, so type the AI binding locally.
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
interface WorkersAI {
  run(
    model: string,
    input: { messages: ChatMessage[]; stream?: boolean; max_tokens?: number; temperature?: number }
  ): Promise<ReadableStream>;
}

// Both $0 on the Workers free plan. fast = more usage/day, smart = deeper.
const MODELS: Record<string, string> = {
  fast: "@cf/meta/llama-3.1-8b-instruct-fp8",
  smart: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
};
const DEFAULT_MODEL: keyof typeof MODELS = "fast";

const SYSTEM_PROMPT =
  "You are a warm, helpful assistant inside the N2S family dashboard, an app the family uses for " +
  "budgeting and news. Amounts are in US dollars. Keep answers concise and friendly.\n\n" +
  "When you are given SEARCH RESULTS or dashboard DATA below, base your answer on them and mention " +
  "the source briefly. Only cite a source that actually appears in the results or data provided.\n\n" +
  "CRITICAL — do not hallucinate: If you were NOT given results or data that answer the question, " +
  "and it needs real-world or current information you don't reliably know (sports scores, prices, " +
  "today's events, specific facts), plainly say you don't have that information. NEVER invent facts, " +
  "scores, numbers, sources, or claim you searched when you didn't. " +
  "Never output JSON and never mention 'tools' or 'function calls' — just answer naturally.";

// ─── Web / news lookups (free, no API key) ───────────────────────────────────

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ").trim();
}

async function webSearch(query: string): Promise<string> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const out: string[] = [];
    const re = /class="result__a"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null && out.length < 5) {
      const title = stripTags(m[1]);
      const snippet = stripTags(m[2]);
      if (title) out.push(`• ${title} — ${snippet}`);
    }
    return out.join("\n");
  } catch {
    return "";
  }
}

async function searchNews(query: string): Promise<string> {
  try {
    const res = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) }
    );
    const xml = await res.text();
    const out: string[] = [];
    const re = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null && out.length < 6) {
      const t = stripTags(m[1]);
      if (t) out.push(`• ${t}`);
    }
    return out.join("\n");
  } catch {
    return "";
  }
}

// Authoritative sports data (ESPN) — far more reliable than scraping the web.
function isSoccer(t: string): boolean {
  return /\b(soccer|football|premier league|la ?liga|bundesliga|serie a|champions league|world cup|match(?:es)?|fixtures?|kickoff|scores?|results?|game)\b/i.test(t);
}
function isUfc(t: string): boolean {
  return /\b(ufc|mma|fight(?:er|s)?|octagon|main event)\b/i.test(t);
}

function formatScores(events: MatchEvent[]): string {
  return events
    .slice(0, 25)
    .map((e) => {
      if (e.state === "in") return `• [${e.league}] ${e.home.name} ${e.home.score}-${e.away.score} ${e.away.name} (LIVE)`;
      if (e.state === "post") return `• [${e.league}] ${e.home.name} ${e.home.score}-${e.away.score} ${e.away.name} (finished)`;
      const t = new Date(e.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `• [${e.league}] ${e.home.name} vs ${e.away.name} (kickoff ${t})`;
    })
    .join("\n");
}

function formatUfc(events: UFCEvent[]): string {
  return events
    .slice(0, 10)
    .map((e) => {
      const d = new Date(e.date).toLocaleDateString("en", { month: "short", day: "numeric" });
      return `• ${e.shortName || e.name} — ${e.mainEvent || "card TBA"} (${d}${e.location ? ", " + e.location : ""})`;
    })
    .join("\n");
}

// Does this message need live/external info? (apostrophe- and plural-tolerant)
function needsLiveInfo(text: string): boolean {
  const t = text.toLowerCase().replace(/['’]/g, ""); // today's -> todays
  if (/https?:\/\//.test(t)) return true;
  // multi-word cues
  if (/(who won|who is winning|when is|when did|what time|what happened|whats happening|look ?up|right now|near me|this week|world cup|super bowl)/.test(t)) return true;
  // single keywords (plural-tolerant)
  return /\b(search|google|browse|latest|current|todays?|tonight|tomorrow|yesterday|recent|news|headlines?|weather|forecast|temperatures?|prices?|stocks?|scores?|results?|games?|match(?:es)?|standings?|fixtures?|tournament|soccer|football|basketball|nba|ufc|mma|championship)\b/.test(
    t
  );
}

// ─── SSE ─────────────────────────────────────────────────────────────────────

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let messages: ChatMessage[] = [];
  let context = "";
  let modelKey: string = DEFAULT_MODEL;
  try {
    const body = (await request.json()) as { messages?: ChatMessage[]; context?: string; model?: string };
    messages = Array.isArray(body.messages) ? body.messages : [];
    context = typeof body.context === "string" ? body.context.slice(0, 4000) : "";
    if (body.model && body.model in MODELS) modelKey = body.model;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const model = MODELS[modelKey];
  const trimmed = messages.slice(-10);

  const system: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  if (context) {
    system.push({
      role: "system",
      content:
        "The family's current dashboard DATA is below. For ANY budget or spending question, " +
        "use ONLY these exact numbers — quote them verbatim. If 'Total spent' is $0, the answer " +
        "is $0. NEVER invent, round, or estimate amounts (e.g. do not say $5,000 or $2,000 unless " +
        "those exact numbers appear here).\n\n" +
        context,
    });
  } else {
    system.push({
      role: "system",
      content:
        "You do not currently have the family's budget data loaded. If asked about specific budget " +
        "or spending amounts, say the data isn't available right now — do NOT make up any numbers.",
    });
  }

  let env: { AI?: WorkersAI };
  try {
    ({ env } = getCloudflareContext() as unknown as { env: { AI?: WorkersAI } });
  } catch {
    env = {};
  }
  if (!env.AI) {
    return Response.json(
      { error: "Chat isn't available here without Cloudflare access. Run `npm run preview` or deploy." },
      { status: 503 }
    );
  }
  const ai = env.AI;
  const lastUser = [...trimmed].reverse().find((m) => m.role === "user")?.content ?? "";

  try {
    // If the message needs live info, fetch it ourselves and hand it to the model
    if (needsLiveInfo(lastUser)) {
      // Strip conversational filler so the search query is clean
      let query = lastUser
        .replace(/^\s*(search( the web)?|google|look ?up)\s*:?\s*/i, "")
        .replace(/^\s*(do you (know|now)|can you (tell me|find|search)|please|tell me|what(?:'s| is| are)|whats|whos|who is)\s+/i, "")
        .replace(/\?+\s*$/, "")
        .trim();
      if (query.length < 3) query = lastUser;

      const blocks: string[] = [];

      if (isUfc(lastUser)) {
        const events = await getUpcomingUfc();
        if (events.length) blocks.push("UPCOMING UFC EVENTS (official ESPN data):\n" + formatUfc(events));
      } else if (isSoccer(lastUser)) {
        const [scores, news] = await Promise.all([getSoccerScores(), searchNews(query)]);
        if (scores.length) blocks.push("TODAY'S SOCCER FIXTURES & SCORES (official ESPN data):\n" + formatScores(scores));
        if (news) blocks.push(`Related news for "${query}":\n${news}`);
      } else {
        const [web, news] = await Promise.all([webSearch(query), searchNews(query)]);
        if (web) blocks.push(`Web search results for "${query}":\n${web}`);
        if (news) blocks.push(`News results for "${query}":\n${news}`);
      }

      const emptyMsg = isSoccer(lastUser)
        ? "There are no soccer matches scheduled in the tracked leagues today (World Cup, Champions League, Premier League, La Liga, Bundesliga, Serie A). Tell the user that plainly."
        : isUfc(lastUser)
        ? "No upcoming UFC events were found. Tell the user that plainly."
        : "You searched but found no useful results. Tell the user you couldn't find current information on that, briefly.";

      const research: ChatMessage = {
        role: "system",
        content: blocks.length
          ? "LIVE RESULTS (fetched just now):\n\n" +
            blocks.join("\n\n") +
            "\n\nAnswer the user's question using ONLY these results, in plain friendly language. " +
            "Mention the source briefly. Do not add scores or facts that aren't listed here."
          : emptyMsg,
      };

      const stream = await ai.run(model, {
        messages: [...system, research, ...trimmed],
        stream: true,
        max_tokens: 1024,
      });
      return new Response(stream, { headers: SSE_HEADERS });
    }

    // Plain conversation — clean streaming, no tools
    const stream = await ai.run(model, {
      messages: [...system, ...trimmed],
      stream: true,
      max_tokens: 1024,
    });
    return new Response(stream, { headers: SSE_HEADERS });
  } catch (err) {
    console.error("Workers AI error:", err);
    return Response.json({ error: "The assistant is unavailable right now." }, { status: 502 });
  }
}
