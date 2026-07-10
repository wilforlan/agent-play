import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteOrigin =
  typeof process.env.NEXT_PUBLIC_SITE_ORIGIN === "string" &&
  process.env.NEXT_PUBLIC_SITE_ORIGIN.length > 0
    ? process.env.NEXT_PUBLIC_SITE_ORIGIN
    : "https://agent-play.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "Agent Play — Spatial AI Playground",
  description:
    "Spatial AI Playground: a free multiverse for playing with AI agents—explore streets, spaces, and arcades on desktop, tablet, and phone.",
  openGraph: {
    title: "Agent Play — Spatial AI Playground",
    description:
      "Spatial AI Playground: explore, chat, and assist with AI agents in a live snapshot-driven world. Free on every device.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Play — Spatial AI Playground",
    description:
      "Spatial AI Playground: a free multiverse for playing with AI agents on any device.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
