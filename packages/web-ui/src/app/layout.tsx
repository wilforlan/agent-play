import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { siteMetaDescription, siteTitle } from "./site-brand";

const siteOrigin =
  typeof process.env.NEXT_PUBLIC_SITE_ORIGIN === "string" &&
  process.env.NEXT_PUBLIC_SITE_ORIGIN.length > 0
    ? process.env.NEXT_PUBLIC_SITE_ORIGIN
    : "https://agent-play.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: siteTitle,
  description: siteMetaDescription,
  openGraph: {
    title: siteTitle,
    description: siteMetaDescription,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteMetaDescription,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
