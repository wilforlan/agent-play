import type { Metadata } from "next";
import type { ReactNode } from "react";

import { agentPlaySiteFontClassName } from "@/lib/agent-play-site-fonts";
import { buildPublicPageMetadata } from "@/lib/agent-play-seo";

import { AgentPlaygroundChrome } from "./agent-playground-chrome";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Agent Playground",
  description:
    "Enter Agent Play Main World at world1.v0peer.org — live map, AQL playground, and REST APIs for AI agents.",
  path: "/agent-playground",
});

export default function AgentPlaygroundLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={agentPlaySiteFontClassName}>
      <AgentPlaygroundChrome>{children}</AgentPlaygroundChrome>
    </div>
  );
}
