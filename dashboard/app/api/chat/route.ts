import { getCloudflareContext } from "@opennextjs/cloudflare";

// ─── Types ───────────────────────────────────────────────────────────────────
// @cloudflare/workers-types isn't installed, so we type the AI binding locally.

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type ToolCall = { name?: string; arguments?: unknown; function?: { name?: string; arguments?: string } };
interface AIResult {
  response?: string;
  tool_calls?: ToolCall[];
}
interface WorkersAI {
  run(
    model: string,
    input: {
      messages: ChatMessage[];
      tools?: unknown[];
      stream?: boolean;
      max_tokens?: number;
      temperature?: number;
    }
  ): Promise<AIResult | ReadableStream>;
}

// Two options the user can toggle between (both $0 on the Workers free plan).
// "fast" = 8B (more free usage/day), "smart" = 70B (deeper, uses more of the daily allowance).
const MODELS: Record<string, string> = {
  fast: "@cf/meta/llama-3.1-8b-instruct-fp8",
  smart: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
};
const DEFAULT_MODEL: keyof typeof MODELS = "fast";

const SYSTEM_PROMPT =
  "You are a warm, helpful assistant inside the N2S family dashboard, an app the family uses " +
  "for budgeting and news. Amounts are in US dollars. Keep answers concise and friendly.\n\n" +
  "You can use tools (web_search, search_news) ONLY when the user clearly asks for current or " +
  "external information you don't already have. For greetings, small talk, budget questions, or " +
  "anything you can answer directly — just reply normally.\n\n" +
  "CRITICAL: Never describe, mention, or narrate tools. Never output JSON, function names, or " +
  "phrases like 'I can suggest a tool call'. Either call a tool silently, or just answer in plain " +
  "conversational language. Never invent budget figures — only use numbers you were given.";

// ─── Tools ───────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the live web for current information, facts, prices, or anything not already provided.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "The search query" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_news",
      description: "Get the latest news headlines about a specific topic or keyword.",
      parameters: {
        type: "object",
        properties: { topic: { type: "string", description: "The news topic or keyword" } },
        required: ["topic"],
      },
    },
  },
];

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

async function webSearch(query: string): Promise<string> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const results: string[] = [];
    const re = /class="result__a"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null && results.length < 5) {
      const title = stripTags(m[1]);
      const snippet = stripTags(m[2]);
      if (title) results.push(`• ${title}\n  ${snippet}`);
    }
    return results.length ? results.join("\n") : "No results found.";
  } catch {
    return "Web search is unavailable right now.";
  }
}

async function searchNews(topic: string): Promise<string> {
  try {
    const res = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) }
    );
    const xml = await res.text();
    const titles: string[] = [];
    const re = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null && titles.length < 6) {
      const t = stripTags(m[1]);
      if (t) titles.push(`• ${t}`);
    }
    return titles.length ? titles.join("\n") : "No news found.";
  } catch {
    return "News search is unavailable right now.";
  }
}

async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  if (name === "web_search") return webSearch(String(args.query ?? args.q ?? ""));
  if (name === "search_news") return searchNews(String(args.topic ?? args.query ?? ""));
  return "Unknown tool.";
}

type Call = { name: string; args: Record<string, unknown> };

// Small models sometimes write the tool call as text instead of emitting a real
// one. Catch that: pull any {"name":"web_search",...} block out of the response.
function extractToolCallsFromText(text: string): Call[] {
  if (!text) return [];
  const out: Call[] = [];
  const re = /\{(?:[^{}]|\{[^{}]*\})*"name"\s*:\s*"(web_search|search_news)"(?:[^{}]|\{[^{}]*\})*\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    try {
      const obj = JSON.parse(m[0]) as { name?: string; parameters?: unknown; arguments?: unknown };
      const p = (obj.parameters ?? obj.arguments ?? {}) as Record<string, unknown>;
      if (obj.name) out.push({ name: obj.name, args: typeof p === "object" && p ? p : {} });
    } catch {
      /* not valid JSON — skip */
    }
  }
  return out;
}

// Strip any leaked tool JSON / meta-narration from a plain answer.
function cleanAnswer(text: string): string {
  return text
    .replace(/\{(?:[^{}]|\{[^{}]*\})*"name"\s*:\s*"(?:web_search|search_news)"(?:[^{}]|\{[^{}]*\})*\}/gi, "")
    .replace(/I don't see a function call[^.]*\.|However, I can suggest[^.]*\.|I can suggest a tool call[^.]*\./gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── SSE helpers ─────────────────────────────────────────────────────────────

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

// Wrap a plain string into the same SSE shape the client already parses.
function sseFromText(text: string): ReadableStream {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ response: text })}\n\n`));
      controller.enqueue(enc.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

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
        "Here is the family's current dashboard data. Use it for budget/news questions. " +
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
      {
        error:
          "Chat isn't available in local `next dev` without Cloudflare access. " +
          "Log in with `wrangler login`, or run `npm run preview` / deploy.",
      },
      { status: 503 }
    );
  }

  const ai = env.AI;

  try {
    // Pass 1 — let the model decide whether to call a tool
    const first = (await ai.run(model, {
      messages: [...system, ...trimmed],
      tools: TOOLS,
      max_tokens: 1024,
    })) as AIResult;

    // Collect tool calls — structured first, then any leaked into the text
    let toolCalls: Call[] = (Array.isArray(first.tool_calls) ? first.tool_calls : [])
      .map((c) => {
        const name = c.name ?? c.function?.name ?? "";
        let args: Record<string, unknown> = {};
        const rawArgs = c.arguments ?? c.function?.arguments;
        if (typeof rawArgs === "string") {
          try {
            args = JSON.parse(rawArgs);
          } catch {
            args = {};
          }
        } else if (rawArgs && typeof rawArgs === "object") {
          args = rawArgs as Record<string, unknown>;
        }
        return { name, args };
      })
      .filter((c) => c.name);

    if (toolCalls.length === 0) {
      toolCalls = extractToolCallsFromText(first.response ?? "");
    }

    if (toolCalls.length > 0) {
      const results: string[] = [];
      for (const c of toolCalls.slice(0, 3)) {
        results.push(`Result of ${c.name}(${JSON.stringify(c.args)}):\n${await runTool(c.name, c.args)}`);
      }

      // Pass 2 — stream the final answer using the tool results
      const toolMsg: ChatMessage = {
        role: "system",
        content:
          "You looked up information to answer. Results:\n\n" +
          results.join("\n\n") +
          "\n\nNow answer the user's question in plain, friendly language using these results. " +
          "Mention the source briefly. Do NOT output JSON or mention tools.",
      };
      const stream = (await ai.run(model, {
        messages: [...system, ...trimmed, toolMsg],
        stream: true,
        max_tokens: 1024,
      })) as unknown as ReadableStream;

      return new Response(stream, { headers: SSE_HEADERS });
    }

    // No tool needed — clean any stray JSON/meta and return the answer
    const answer = cleanAnswer(first.response ?? "");
    return new Response(sseFromText(answer || "Hi! How can I help you today?"), { headers: SSE_HEADERS });
  } catch (err) {
    console.error("Workers AI error:", err);
    return Response.json({ error: "The assistant is unavailable right now." }, { status: 502 });
  }
}
