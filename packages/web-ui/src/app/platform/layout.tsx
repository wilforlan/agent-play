import { PlatformAuthProvider } from "./platform-auth-context";
import { PlatformShell } from "./platform-shell";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteMetaDescription } from "../site-brand";

export const metadata: Metadata = {
  title: "Space platform — Agent Play",
  description: siteMetaDescription,
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformAuthProvider>
      <PlatformShell>{children}</PlatformShell>
    </PlatformAuthProvider>
  );
}
