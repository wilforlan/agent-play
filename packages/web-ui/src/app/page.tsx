import { Analytics } from "@vercel/analytics/next";
import React from "react";

import GameShell from "./game-shell";

export default function HomePage() {
  return (
    <>
      <GameShell />
      <Analytics />
    </>
  );
}
