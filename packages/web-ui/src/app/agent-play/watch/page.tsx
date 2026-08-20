import type { Metadata } from "next";

import { buildNoIndexMetadata } from "@/lib/agent-play-seo";

import GameShell from "../../game-shell";

export const metadata: Metadata = buildNoIndexMetadata({
  title: "Watch",
});

export default function WatchPage() {
  return <GameShell />;
}
