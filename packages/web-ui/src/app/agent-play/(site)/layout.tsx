import { IBM_Plex_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildAgentPlayMarketplaceMetadata } from "@/lib/agent-play-seo";

import { AgentPlay } from "./agent-play";

export const metadata: Metadata = buildAgentPlayMarketplaceMetadata({
  path: [],
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--ap-font-sans",
  display: "swap",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--ap-font-display",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--ap-font-mono",
  display: "swap",
});

export default function AgentPlaySiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <AgentPlay>{children}</AgentPlay>
    </div>
  );
}
