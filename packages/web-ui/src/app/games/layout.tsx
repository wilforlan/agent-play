import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildAgentPlayGamesPageMetadata } from "@/lib/agent-play-seo";

import { AgentPlayGamesChrome } from "./agent-play-games-chrome";

export const metadata: Metadata = buildAgentPlayGamesPageMetadata({ slug: [] });

export default function AgentPlayGamesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AgentPlayGamesChrome>{children}</AgentPlayGamesChrome>;
}
