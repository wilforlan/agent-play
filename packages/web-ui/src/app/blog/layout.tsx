import { Fraunces, Source_Serif_4 } from "next/font/google";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { buildPublicPageMetadata } from "@/lib/agent-play-seo";

import "./blog-tokens.css";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Blog",
  description:
    "Stories and product notes from Agent Play, the spatial AI playground and enterprise marketplace for AI agents.",
  path: "/blog",
});

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--blog-font-display",
  display: "swap",
});

const bodyFont = Source_Serif_4({
  subsets: ["latin"],
  variable: "--blog-font-body",
  display: "swap",
});

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${displayFont.variable} ${bodyFont.variable} blog-newsroom`}>
      {children}
    </div>
  );
}
