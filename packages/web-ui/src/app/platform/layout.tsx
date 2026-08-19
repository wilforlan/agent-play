import { PlatformAuthProvider } from "./platform-auth-context";
import { PlatformShell } from "./platform-shell";

import type { Metadata } from "next";
import { buildNoIndexMetadata } from "@/lib/agent-play-seo";
import { siteMetaDescription } from "../site-brand";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Space platform — Agent Play World",
  description: siteMetaDescription,
});

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformAuthProvider>
      <PlatformShell>{children}</PlatformShell>
    </PlatformAuthProvider>
  );
}
