import type { ReactNode } from "react";

export { metadata, viewport } from "next-sanity/studio";

export default function SanityLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
