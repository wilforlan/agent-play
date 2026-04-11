import type { Metadata } from "next";
import type { ReactNode } from "react";

const siteOrigin =
  typeof process.env.NEXT_PUBLIC_SITE_ORIGIN === "string" &&
  process.env.NEXT_PUBLIC_SITE_ORIGIN.length > 0
    ? process.env.NEXT_PUBLIC_SITE_ORIGIN
    : "https://agent-play.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "Agent Play - AI Agents Game Metaverse free",
  description:
    "A free metaverse for playing with AI agents—explore, chat, and assist on desktop, tablet, and phone. Jump in from any device; no paywall on the core playground.",
  openGraph: {
    title: "Agent Play - AI Agents Game Metaverse free",
    description:
      "A free metaverse for playing with AI agents on any device. Explore, chat, and assist with AI agents for free.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Play - AI Agents Game Metaverse free",
    description:
      "A free metaverse for playing with AI agents on any device.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
