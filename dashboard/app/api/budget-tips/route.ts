import { getCloudflareContext } from "@opennextjs/cloudflare";

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

interface AIResult {
  response?: string;
}
interface WorkersAI {
  run(
    model: string,
    input: { messages: { role: string; content: string }[]; max_tokens?: number }
  ): Promise<AIResult>;
}

export async function POST(request: Request) {
  let summary = "";
  try {
    const body = (await request.json()) as { summary?: string };
    summary = typeof body.summary === "string" ? body.summary.slice(0, 3000) : "";
  } catch {
    return Response.json({ tips: "" });
  }
  if (!summary) return Response.json({ tips: "" });

  let env: { AI?: WorkersAI };
  try {
    ({ env } = getCloudflareContext() as unknown as { env: { AI?: WorkersAI } });
  } catch {
    env = {};
  }
  if (!env.AI) return Response.json({ tips: "" });

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        {
          role: "system",
          content:
            "You are a practical personal-finance coach. Based ONLY on the numbers given, write 3 short, " +
            "specific, actionable suggestions to improve savings and manage spending. Each a single sentence " +
            "starting with '- '. Use the actual figures. No preamble, no invented numbers.",
        },
        { role: "user", content: summary },
      ],
      max_tokens: 260,
    });
    return Response.json({ tips: (result.response ?? "").trim() });
  } catch {
    return Response.json({ tips: "" });
  }
}
