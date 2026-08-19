import type { Metadata } from "next";
import type { ReactNode } from "react";

import { metadata as studioMetadata, viewport } from "next-sanity/studio";

export const metadata: Metadata = {
  ...studioMetadata,
  robots: {
    index: false,
    follow: false,
  },
};

export { viewport };

export default function SanityLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
