import { describe, expect, it } from "vitest";
import { ACCESS_HEADER, decodeAccessJwt, identityFromHeaders } from "@/lib/auth";

function jwt(payload: object): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64({ alg: "RS256" })}.${b64(payload)}.signature`;
}

describe("decodeAccessJwt", () => {
  it("reads claims out of a well-formed token", () => {
    expect(decodeAccessJwt(jwt({ email: "a@b.com" }))).toEqual({ email: "a@b.com" });
  });

  it("returns null for a malformed token rather than throwing", () => {
    expect(decodeAccessJwt("not-a-jwt")).toBeNull();
    expect(decodeAccessJwt("a.b.c")).toBeNull();
  });
});

describe("identityFromHeaders", () => {
  it("resolves an identity from the Access header", () => {
    const h = new Headers({ [ACCESS_HEADER]: jwt({ email: "adrian@n2s.dev" }) });
    expect(identityFromHeaders(h)).toEqual({
      email: "adrian@n2s.dev",
      name: "adrian",
      role: "admin",
    });
  });

  it("returns null when a token is present but unreadable — never a default", () => {
    const h = new Headers({ [ACCESS_HEADER]: "garbage" });
    expect(identityFromHeaders(h)).toBeNull();
  });
});
