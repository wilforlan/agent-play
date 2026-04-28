"use client";

import { useEffect } from "react";

const vendorMainPromise = import("./vendor/main");

export default function WatchBootstrap() {
  useEffect(() => {
    void vendorMainPromise.then((m) => {
      if (typeof m.bootstrap === "function") {
        m.bootstrap();
      }
    });
  }, []);
  return (
    <div
      id="watch-root"
      style={{
        minHeight: "100dvh",
        background: "#0f172a",
        display: "flex",
        flexDirection: "column",
      }}
    />
  );
}
