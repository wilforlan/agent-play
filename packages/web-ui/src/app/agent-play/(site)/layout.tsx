import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AgentPlay } from "./agent-play";
import { AGENT_PLAY_BRAND, AGENT_PLAY_HERO } from "./agent-play-content";

export const metadata: Metadata = {
  title: `${AGENT_PLAY_BRAND.name} — ${AGENT_PLAY_HERO.kicker}`,
  description: AGENT_PLAY_HERO.subtitle,
};

export default function AgentPlaySiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AgentPlay>{children}</AgentPlay>;
}
