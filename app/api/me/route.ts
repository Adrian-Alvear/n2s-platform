import { identityFromHeaders } from "@/lib/auth";

export async function GET(request: Request) {
  const identity = identityFromHeaders(request.headers);

  if (!identity) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  return Response.json(identity);
}
