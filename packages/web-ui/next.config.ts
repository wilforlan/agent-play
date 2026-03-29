import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_AGENT_PLAY_BASE:
      process.env.NEXT_PUBLIC_AGENT_PLAY_BASE ?? "/agent-play",
    NEXT_PUBLIC_PLAY_API_BASE:
      process.env.NEXT_PUBLIC_PLAY_API_BASE ?? "/agent-play",
  },
  async rewrites() {
    return [
      {
        source: "/agent-play/snapshot.json",
        destination: "/api/agent-play/snapshot",
      },
      {
        source: "/agent-play/events",
        destination: "/api/agent-play/events",
      },
      {
        source: "/agent-play/proximity-action",
        destination: "/api/agent-play/proximity-action",
      },
      {
        source: "/agent-play/assist-tool",
        destination: "/api/agent-play/assist-tool",
      },
    ];
  },
};

export default nextConfig;
