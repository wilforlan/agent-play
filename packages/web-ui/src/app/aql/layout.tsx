import type { Metadata } from "next";
import React, { type ReactNode } from "react";

import { AgentPlaygroundChrome } from "@/app/agent-playground/agent-playground-chrome";
import { agentPlaySiteFontClassName } from "@/lib/agent-play-site-fonts";
import { buildPublicPageMetadata } from "@/lib/agent-play-seo";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "AQL Docs",
  description:
    "Agent Query Language for Main World — connect to https://agent-play.com, inspect nodes, send intercom, and author amenities.",
  path: "/aql",
});

export default function AqlDocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className={agentPlaySiteFontClassName}>
      <AgentPlaygroundChrome>{children}</AgentPlaygroundChrome>
    </div>
  );
}
