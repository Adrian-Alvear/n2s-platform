import { Newspaper } from "lucide-react";

export default function News() {
  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mb-6">
        <Newspaper size={28} className="text-emerald-600" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">News</h1>
      <p className="text-muted-foreground mt-2 max-w-sm">
        Multi-source aggregator — YouTube, Reddit, RSS, blogs. All in one feed, curated for you.
      </p>
      <p className="text-xs text-muted-foreground mt-6 bg-muted px-3 py-1.5 rounded-full">Coming in Phase 6</p>
    </div>
  );
}
