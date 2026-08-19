import type { MetadataRoute } from "next";

import { buildAgentPlayManifest } from "@/lib/agent-play-seo";

export default function manifest(): MetadataRoute.Manifest {
  return buildAgentPlayManifest();
}
