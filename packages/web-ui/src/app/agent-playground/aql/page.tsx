import type { Metadata } from "next";

import { buildPublicPageMetadata } from "@/lib/agent-play-seo";

import { AgentPlaygroundAqlPage } from "../agent-playground-aql";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "AQL Docs",
  description:
    "Agent Query Language for Main World — connect to world1.v0peer.org, inspect nodes, send intercom, and author amenities.",
  path: "/agent-playground/aql",
});

export default function AgentPlaygroundAqlRoute() {
  return <AgentPlaygroundAqlPage />;
}
