export type UFCEvent = {
  id: string;
  name: string;
  shortName: string;
  date: string;
  venue: string;
  location: string;
  state: string;
  mainEvent: string;
};

// Shared — used by this route AND the chat assistant (direct call, no internal
// HTTP fetch which Cloudflare Access would block).
export async function getUpcomingUfc(): Promise<UFCEvent[]> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;

  const end = new Date(now);
  end.setDate(end.getDate() + 120);
  const endStr = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}`;

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard?dates=${start}-${endStr}&limit=20`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; n2s-dashboard/1.0)" } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const events: UFCEvent[] = ((data.events as Record<string, unknown>[]) ?? [])
      .filter((e) => {
        const status = e.status as Record<string, unknown>;
        const type = status?.type as Record<string, unknown>;
        return (type?.state as string) !== "post";
      })
      .map((e) => {
        const comps = e.competitions as Record<string, unknown>[];
        const comp = comps?.[0];
        const competitors = (comp?.competitors as Record<string, unknown>[]) ?? [];
        const venue = comp?.venue as Record<string, unknown>;
        const address = venue?.address as Record<string, unknown>;

        const fighterNames = competitors
          .map((c) => {
            const athlete = (c.athlete ?? c.team) as Record<string, unknown>;
            return (athlete?.displayName ?? athlete?.shortDisplayName ?? "") as string;
          })
          .filter(Boolean);

        return {
          id: e.id as string,
          name: (e.name as string) ?? "",
          shortName: (e.shortName as string) ?? (e.name as string) ?? "",
          date: (e.date as string) ?? "",
          venue: (venue?.fullName as string) ?? "",
          location: address ? `${address.city ?? ""}, ${address.state ?? address.country ?? ""}`.replace(/^,\s*|,\s*$/, "") : "",
          state: ((e.status as Record<string, unknown>)?.type as Record<string, unknown>)?.state as string ?? "pre",
          mainEvent: fighterNames.slice(0, 2).join(" vs "),
        };
      });

    return events;
  } catch {
    return [];
  }
}

export async function GET() {
  const events = await getUpcomingUfc();
  return Response.json({ events }, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
  });
}
