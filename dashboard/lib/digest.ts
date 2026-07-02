// Turn a digest string into clean bullet lines (strips "-", "•", "1." markers).
export function parseDigest(text: string): string[] {
  if (!text) return [];
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^\s*[-•*•]\s*/, "").replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
  // If the model returned one blob, fall back to sentence-ish splitting
  if (lines.length <= 1) {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return lines;
}
