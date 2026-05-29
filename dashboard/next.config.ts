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
