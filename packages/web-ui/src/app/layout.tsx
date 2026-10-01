import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import "./globals.css";
import { AgentPlayJsonLd } from "@/components/agent-play-json-ld";
import {
  buildAgentPlayRootMetadata,
  resolveRootSeoCatalogFromHost,
} from "@/lib/agent-play-seo";
import {
  readRequestHostFromHeaders,
  resolveSeoOriginFromHost,
} from "@/lib/agent-play-host-seo";

export async function generateMetadata(): Promise<Metadata> {
  const host = readRequestHostFromHeaders(await headers());
  const resolved = resolveRootSeoCatalogFromHost(host);
  const origin = resolveSeoOriginFromHost({
    host,
    envOrigin: process.env.NEXT_PUBLIC_SITE_ORIGIN,
  });

  return buildAgentPlayRootMetadata({
    origin,
    catalog: resolved.catalog,
    googleSiteVerification:
      resolved.kind === "agent-play"
        ? process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
        : undefined,
  });
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <AgentPlayJsonLd />
        {children}
      </body>
    </html>
  );
}
