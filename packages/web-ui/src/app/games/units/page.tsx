import type { Metadata } from "next";

import { buildAgentPlayGamesPageMetadata } from "@/lib/agent-play-seo";

import { AgentPlayGamesUnitsPage } from "../agent-play-games-units";

export const metadata: Metadata = buildAgentPlayGamesPageMetadata({
  slug: ["units"],
});

export default function AgentPlayGamesUnitsRoute() {
  return <AgentPlayGamesUnitsPage />;
}
