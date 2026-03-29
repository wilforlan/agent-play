"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const WatchCanvas = dynamic(() => import("@/canvas/watch-bootstrap"), {
  ssr: false,
});

export default function GameShell() {
  return <WatchCanvas />;
}
