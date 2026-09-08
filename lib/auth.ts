/**
 * Identity via Cloudflare Access (docs/BUILD-PROMPT.md §2.2, §3).
 *
 * Access sits in front of every /hub route and injects a signed JWT in the
 * `cf-access-jwt-assertion` header. There is no in-app login form, no password
 * and no session table — Access IS the auth.
 *
 * SECURITY — READ BEFORE PRODUCTION.
 * `decodeAccessJwt` below reads the token's claims WITHOUT verifying its
 * signature. That is safe only while every request is forced through Access.
 * If the Worker's origin is ever reachable directly, a forged header would be
 * trusted. Before the first production deploy, `verifyAccessJwt` must validate
 * the signature against the team's JWKS at
 *   https://<team>.cloudflareaccess.com/cdn-cgi/access/certs
 * and check `aud` against the Access application audience tag.
 */

export type Identity = {
  email: string;
  name: string;
  role: "admin" | "viewer";
};

export const ACCESS_HEADER = "cf-access-jwt-assertion";

/** Local dev has no Access in front of it, so fall back to an admin identity. */
export const DEV_IDENTITY: Identity = {
  email: "adrianalvear09@gmail.com",
  name: "Adrian",
  role: "admin",
};

/** Decode a JWT payload without verification. See the security note above. */
export function decodeAccessJwt(token: string): { email?: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * Resolve the caller's identity from request headers.
 * Returns null when a token is present but unreadable — never a default.
 */
export function identityFromHeaders(headers: Headers): Identity | null {
  const token = headers.get(ACCESS_HEADER);

  if (!token) {
    return process.env.NODE_ENV === "development" ? DEV_IDENTITY : null;
  }

  const claims = decodeAccessJwt(token);
  if (!claims?.email) return null;

  return {
    email: claims.email,
    name: claims.email.split("@")[0],
    role: "admin",
  };
}
