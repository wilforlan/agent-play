"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import GameShell from "./game-shell";
import { getNextPanelFromDelta, type HomePanel } from "@/lib/home-swipe";

const DESKTOP_BREAKPOINT = 1024;

const getIsDesktopViewport = (): boolean =>
  typeof window !== "undefined" && window.innerWidth >= DESKTOP_BREAKPOINT;

const LandingPage = () => {
  return (
    <section
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
        padding: "4rem 2rem",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Agent Play</h1>
        <p style={{ fontSize: "1.1rem", color: "#cbd5e1", marginBottom: "2rem" }}>
          Build, test, and interact with AI agents in a real-time world.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/blog" style={{ color: "#93c5fd", textDecoration: "none" }}>
            Visit Newsroom
          </Link>
          <Link href="/doc" style={{ color: "#93c5fd", textDecoration: "none" }}>
            Explore Documentation
          </Link>
          <a href="https://github.com/wilforlan/agent-play" style={{ color: "#93c5fd", textDecoration: "none" }}>
            View on Github
          </a>
        </div>
      </div>
    </section>
  );
};

export default function HomePageShell() {
  const [panel, setPanel] = useState<HomePanel>("game");
  const [isDesktop, setIsDesktop] = useState(false);
  const offset = useMemo(() => (panel === "game" ? "0vh" : "-100vh"), [panel]);

  useEffect(() => {
    const updateViewport = () => {
      const desktop = getIsDesktopViewport();
      setIsDesktop(desktop);
      if (!desktop) {
        setPanel("game");
      }
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      setPanel((currentPanel) =>
        getNextPanelFromDelta({
          currentPanel,
          deltaY: event.deltaY,
          isDesktop: true,
        }),
      );
    };

    let touchStartY = 0;
    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };
    const handleTouchEnd = (event: TouchEvent) => {
      const touchEndY = event.changedTouches[0]?.clientY ?? 0;
      setPanel((currentPanel) =>
        getNextPanelFromDelta({
          currentPanel,
          deltaY: touchStartY - touchEndY,
          isDesktop: true,
        }),
      );
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDesktop]);

  if (!isDesktop) {
    return (
      <>
        <GameShell />
        <LandingPage />
      </>
    );
  }

  return (
    <div style={{ height: "100vh", overflow: "hidden" }}>
      <div
        style={{
          transform: `translateY(${offset})`,
          transition: "transform 260ms ease",
        }}
      >
        <div style={{ minHeight: "100vh" }}>
          <GameShell />
        </div>
        <LandingPage />
      </div>
    </div>
  );
}
