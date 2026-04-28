"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import GameShell from "./game-shell";
import { getNextPanelFromDelta, type HomePanel } from "@/lib/home-swipe";

const DESKTOP_BREAKPOINT = 1024;

const getIsDesktopViewport = (): boolean =>
  typeof window !== "undefined" && window.innerWidth >= DESKTOP_BREAKPOINT;

const HomeLanding = dynamic(() => import("./home-landing"), {
  ssr: false,
  loading: () => null,
});

export default function HomePageShell() {
  const [panel, setPanel] = useState<HomePanel>("game");
  const [isDesktop, setIsDesktop] = useState(false);
  const [isLandingReady, setIsLandingReady] = useState(false);
  const effectivePanel = isLandingReady ? panel : "game";
  const offset = useMemo(() => (effectivePanel === "game" ? "0vh" : "-100vh"), [effectivePanel]);

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
    if (!isDesktop || !isLandingReady) {
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
  }, [isDesktop, isLandingReady]);

  useEffect(() => {
    if (!isDesktop) {
      setIsLandingReady(false);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;
    const scheduleLanding = () => setIsLandingReady(true);

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(scheduleLanding, { timeout: 900 });
    } else {
      timeoutId = setTimeout(scheduleLanding, 450);
    }

    return () => {
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [isDesktop]);

  if (!isDesktop) {
    return <GameShell />;
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
        {isLandingReady ? <HomeLanding /> : null}
      </div>
    </div>
  );
}
