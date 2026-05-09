"use client";

import WatchBootstrap from "@/canvas/watch-bootstrap";

export default function GameShell() {
  const useIosDesignSystem =
    process.env.NEXT_PUBLIC_ENABLE_IOS_DS === "1" ||
    process.env.NEXT_PUBLIC_ENABLE_IOS_DS === "true";
  return (
    <div className={useIosDesignSystem ? "ios-ds-enabled" : undefined}>
      <WatchBootstrap />
    </div>
  );
}
