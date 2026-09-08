import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_HEADER } from "@/lib/auth";

/**
 * The gate (docs/BUILD-PROMPT.md §2.2).
 *
 * Cloudflare Access is the real boundary — it refuses the request before it
 * reaches the Worker. This middleware is defence in depth for the case where
 * the origin is reached directly, and it keeps local dev honest.
 */
export function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const hasToken = Boolean(request.headers.get(ACCESS_HEADER));

  if (!isDev && !hasToken) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.next();
}

/** Only /hub is gated. The whole front face stays public. */
export const config = {
  matcher: ["/hub/:path*"],
};
