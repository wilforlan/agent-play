import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Agent Play Scanner",
  description:
    "Public observability terminal for Agent Play chain state, wallet ledger, APU activity, and in-platform analytics.",
};

export default function ScannerLayout({ children }: { children: ReactNode }) {
  return children;
}
