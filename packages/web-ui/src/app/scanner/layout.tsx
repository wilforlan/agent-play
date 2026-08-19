import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPublicPageMetadata } from "@/lib/agent-play-seo";
import { siteMetaDescription } from "../site-brand";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Agent Play World Scanner",
  description: `${siteMetaDescription} Public observability terminal for chain state, wallet ledger, APU activity, and in-platform analytics.`,
  path: "/scanner",
});

export default function ScannerLayout({ children }: { children: ReactNode }) {
  return children;
}
