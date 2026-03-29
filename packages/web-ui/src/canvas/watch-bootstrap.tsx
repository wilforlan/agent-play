"use client";

import { useEffect } from "react";

export default function WatchBootstrap() {
  useEffect(() => {
    void import("./vendor/main").then((m) => {
      if (typeof m.bootstrap === "function") {
        m.bootstrap();
      }
    });
  }, []);
  return (
    <div
      id="watch-root"
      style={{ minHeight: "100vh", background: "#0f172a" }}
    />
  );
}
