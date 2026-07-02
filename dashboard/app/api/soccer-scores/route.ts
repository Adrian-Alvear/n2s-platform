type Team = { name: string; abbr: string; logo: string; score: string };
export type MatchEvent = {
  id: string;
  league: string;
  date: string;
  status: string;
  state: string;
  home: Team;
  away: Team;
};

const LEAGUES = [
  { id: "fifa.world", name: "World Cup 2026" },
  { id: "uefa.champions", name: "Champions League" },
  { id: "eng.1", name: "Premier League" },
  { id: "esp.1", name: "La Liga" },
  { id: "ger.1", name: "Bundesliga" },
  { id: "ita.1", name: "Serie A" },
];

function parseEvent(event: Record<string, unknown>, leagueName: string): MatchEvent | null {
  const status = event.status as Record<string, unknown>;
  const statusType = status?.type as Record<string, unknown>;
  const competitions = event.competitions as Record<string, unknown>[];
  const comp = competitions?.[0];
  if (!comp) return null;

  const competitors = (comp.competitors as Record<string, unknown>[]) ?? [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home || !away) return null;

  const homeTeam = home.team as Record<string, unknown>;
  const awayTeam = away.team as Record<string, unknown>;

  return {
    id: event.id as string,
    league: leagueName,
    date: event.date as string,
    status: ((statusType?.shortDetail ?? statusType?.description) as string) ?? "",
    state: (statusType?.state as string) ?? "pre",
    home: {
      name: (homeTeam?.displayName as string) ?? "",
      abbr: (homeTeam?.abbreviation as string) ?? "",
      logo: (homeTeam?.logo as string) ?? "",
      score: (home.score as string) ?? "",
    },
    away: {
      name: (awayTeam?.displayName as string) ?? "",
      abbr: (awayTeam?.abbreviation as string) ?? "",
      logo: (awayTeam?.logo as string) ?? "",
      score: (away.score as string) ?? "",
    },
  };
}

// Shared — used by this route AND the chat assistant (direct call, no internal
// HTTP fetch which Cloudflare Access would block).
export async function getSoccerScores(): Promise<MatchEvent[]> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateParam = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;

  const results = await Promise.allSettled(
    LEAGUES.map(async ({ id, name }) => {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${id}/scoreboard?dates=${dateParam}&limit=50`,
        { headers: { "User-Agent": "Mozilla/5.0 (compatible; n2s-dashboard/1.0)" } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return ((data.events as Record<string, unknown>[]) ?? [])
        .map((e) => parseEvent(e, name))
        .filter((e): e is MatchEvent => e !== null);
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<MatchEvent[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .sort((a, b) => {
      const order: Record<string, number> = { in: 0, post: 1, pre: 2 };
      const ao = order[a.state] ?? 3;
      const bo = order[b.state] ?? 3;
      if (ao !== bo) return ao - bo;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
}

export async function GET() {
  const events = await getSoccerScores();
  return Response.json({ events }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
