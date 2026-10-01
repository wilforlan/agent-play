import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import "./globals.css";
import { AgentPlayJsonLd } from "@/components/agent-play-json-ld";
import {
  buildAgentPlayRootMetadata,
  normalizeRequestHost,
  resolveRootSeoCatalogFromHost,
  resolveSeoOriginFromHost,
} from "@/lib/agent-play-seo";

const readRequestHost = async (): Promise<string> => {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-host");
  const host = headerList.get("host");
  const raw = forwarded?.split(",")[0]?.trim() || host?.trim() || "";
  if (raw.length === 0) {
    return "agent-play.com";
  }
  return normalizeRequestHost(raw);
};

export async function generateMetadata(): Promise<Metadata> {
  const host = await readRequestHost();
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
