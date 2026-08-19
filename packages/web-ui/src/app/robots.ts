import type { MetadataRoute } from "next";

import {
  buildAgentPlayRobots,
  resolveAgentPlayOrigin,
} from "@/lib/agent-play-seo";

export default function robots(): MetadataRoute.Robots {
  const origin = resolveAgentPlayOrigin({
    envValue: process.env.NEXT_PUBLIC_SITE_ORIGIN,
  });

  return buildAgentPlayRobots({ origin });
}
