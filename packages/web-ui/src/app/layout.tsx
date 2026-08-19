import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AgentPlayJsonLd } from "@/components/agent-play-json-ld";
import {
  buildAgentPlayRootMetadata,
  resolveAgentPlayOrigin,
} from "@/lib/agent-play-seo";

const origin = resolveAgentPlayOrigin({
  envValue: process.env.NEXT_PUBLIC_SITE_ORIGIN,
});

export const metadata: Metadata = buildAgentPlayRootMetadata({
  origin,
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
});

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
