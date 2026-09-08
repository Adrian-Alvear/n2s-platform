/**
 * Lab demos — technique studies built from supplied specs.
 *
 * These are DEVELOPMENT ONLY and 404 in production. Two reasons, both real:
 *
 * 1. The designs are recreations of third-party specs. Publishing them as N2S's
 *    own work would be misrepresenting them (§8).
 * 2. They reference video hosted on someone else's CDN. Loading that locally
 *    while studying the technique is one thing; serving it from a commercial
 *    site is another.
 *
 * To publish any of this, the design has to become ours and the media has to be
 * replaced with an asset we hold rights to.
 */

export const DEMOS_ENABLED = process.env.NODE_ENV !== "production";

/** Reference media. Never ship these — see the module comment. */
export const REF_VIDEO = {
  securify:
    "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4",
  portfolio:
    "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260725_114042_d2ed2a89-f2fa-449b-9609-da456344257b.mp4",
  trav:
    "https://cdn.sceneai.art/Hero%20Section%20Video/0519be39-d8d1-48a5-84ee-f8a1ec038cd6.mp4",
} as const;
