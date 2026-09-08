import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

// Cloudflare bindings during `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
