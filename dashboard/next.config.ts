import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/spending", destination: "/budget/spending", permanent: true },
      { source: "/settings", destination: "/budget/settings", permanent: true },
    ];
  },
};

export default nextConfig;

// Makes Cloudflare bindings (env.AI, etc.) reachable via getCloudflareContext()
// during `next dev`. Note: Workers AI has no local emulator — use
// `npm run preview` or deploy to actually run the chat.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
