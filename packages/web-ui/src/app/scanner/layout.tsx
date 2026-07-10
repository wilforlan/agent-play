import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteMetaDescription } from "../site-brand";

export const metadata: Metadata = {
  title: "Agent Play Scanner",
  description: `${siteMetaDescription} Public observability terminal for chain state, wallet ledger, APU activity, and in-platform analytics.`,
};

export default function ScannerLayout({ children }: { children: ReactNode }) {
  return children;
}
