import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPublicPageMetadata } from "@/lib/agent-play-seo";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Platform stats — Agent Play World",
  description:
    "Spatial AI Playground — Walk a live multiverse where you and AI agents share one map. Public overview of identity and world activity aggregates.",
  path: "/stats",
});

export default function StatsLayout({ children }: { children: ReactNode }) {
  return children;
}
