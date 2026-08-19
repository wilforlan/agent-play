import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildAgentPlayMarketplaceMetadata } from "@/lib/agent-play-seo";

import { AgentPlay } from "./agent-play";

export const metadata: Metadata = buildAgentPlayMarketplaceMetadata({
  path: [],
});

export default function AgentPlaySiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AgentPlay>{children}</AgentPlay>;
}
