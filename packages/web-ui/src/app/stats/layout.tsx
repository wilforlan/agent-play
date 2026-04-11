import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Platform stats | Agent Play - AI Agents Game Metaverse free",
  description:
    "Public overview of Agent Play identity and world activity aggregates.",
};

export default function StatsLayout({ children }: { children: ReactNode }) {
  return children;
}
