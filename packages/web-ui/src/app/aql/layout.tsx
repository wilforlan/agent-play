import type { Metadata } from "next";
import React, { type ReactNode } from "react";

import { AgentPlaygroundChrome } from "@/app/agent-playground/agent-playground-chrome";
import { buildPublicPageMetadata } from "@/lib/agent-play-seo";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "AQL Docs",
  description:
    "Agent Query Language for Main World — connect to world1.v0peer.org, inspect nodes, send intercom, and author amenities.",
  path: "/aql",
});

export default function AqlDocsLayout({ children }: { children: ReactNode }) {
  return <AgentPlaygroundChrome>{children}</AgentPlaygroundChrome>;
}
