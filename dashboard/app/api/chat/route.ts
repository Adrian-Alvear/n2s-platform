import { getCloudflareContext } from "@opennextjs/cloudflare";

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
  "the source briefly. Never invent budget figures — only use numbers you were given. " +
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

// Does this message need live/external info?
function needsLiveInfo(text: string): boolean {
  const t = text.toLowerCase();
  if (/https?:\/\//.test(t)) return true;
  return /\b(search|google|look up|lookup|latest|current|today|tonight|this week|recent|news|headline|weather|forecast|price|cost of|stock|score|who won|when is|what time|what happened|happening|right now|near me|update on)\b/.test(
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
        "Here is the family's current dashboard DATA. Use it for budget/news questions. " +
        "Only use these numbers — do not invent figures.\n\n" +
        context,
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
      const query = lastUser.replace(/^\s*(search( the web)?|google|look ?up)\s*:?\s*/i, "").trim() || lastUser;
      const wantsNews = /\b(news|headline|latest)\b/i.test(lastUser);
      const [web, news] = await Promise.all([
        webSearch(query),
        wantsNews ? searchNews(query) : Promise.resolve(""),
      ]);

      const blocks: string[] = [];
      if (web) blocks.push(`Web search results for "${query}":\n${web}`);
      if (news) blocks.push(`News results for "${query}":\n${news}`);

      const research: ChatMessage = {
        role: "system",
        content: blocks.length
          ? "SEARCH RESULTS (live from the web):\n\n" +
            blocks.join("\n\n") +
            "\n\nAnswer the user's question using these results, in plain friendly language. Mention the source briefly."
          : "You tried to search the web but found no useful results. Tell the user you couldn't find current information on that, briefly.",
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
