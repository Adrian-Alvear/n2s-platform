// Rough, device-local estimate of how much of the daily free Workers AI
// allowance has been used. This is an ESTIMATE (based on typical neuron cost
// per request) to give a sense of headroom — the exact number lives in the
// Cloudflare dashboard (Workers AI → usage). Resets daily.

const KEY = "n2s_ai_usage";
export const DAILY_FREE = 10000; // neurons/day on the free plan

// Approx neurons per chat message by model (order-of-magnitude)
export const EST = { fast: 400, smart: 1600, digest: 300 };

type Usage = { date: string; neurons: number };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function read(): Usage {
  try {
    const u = JSON.parse(localStorage.getItem(KEY) || "{}") as Usage;
    if (u && u.date === today() && typeof u.neurons === "number") return u;
  } catch {
    /* ignore */
  }
  return { date: today(), neurons: 0 };
}

export function addUsage(neurons: number) {
  const u = read();
  u.neurons += neurons;
  try {
    localStorage.setItem(KEY, JSON.stringify(u));
  } catch {
    /* ignore */
  }
}

export function getUsage(): { used: number; remaining: number; pct: number } {
  const u = read();
  const used = Math.min(u.neurons, DAILY_FREE);
  return {
    used,
    remaining: Math.max(0, DAILY_FREE - u.neurons),
    pct: Math.min(100, Math.round((u.neurons / DAILY_FREE) * 100)),
  };
}
