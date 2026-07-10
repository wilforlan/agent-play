"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import GameShell from "./game-shell";
import { getNextPanelFromDelta, type HomePanel } from "@/lib/home-swipe";
import { HOME_LANDING_SCROLL_EVENT } from "./home-landing-articles";

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
  const panelRef = useRef<HomePanel>("game");
  const landingScrollRef = useRef<HTMLDivElement>(null);
  const effectivePanel = isLandingReady ? panel : "game";
  const offset = useMemo(() => (effectivePanel === "game" ? "0vh" : "-100vh"), [effectivePanel]);

  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);

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
      const currentPanel = panelRef.current;
      const landingEl = landingScrollRef.current;

      if (currentPanel === "game") {
        const next = getNextPanelFromDelta({
          currentPanel,
          deltaY: event.deltaY,
          isDesktop: true,
        });
        if (next !== currentPanel) {
          setPanel(next);
        }
        return;
      }

      if (landingEl !== null && landingEl.scrollTop > 0) {
        return;
      }

      const next = getNextPanelFromDelta({
        currentPanel,
        deltaY: event.deltaY,
        isDesktop: true,
      });
      if (next !== currentPanel) {
        setPanel(next);
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };
    const handleTouchEnd = (event: TouchEvent) => {
      const currentPanel = panelRef.current;
      const landingEl = landingScrollRef.current;
      const touchEndY = event.changedTouches[0]?.clientY ?? 0;
      const deltaY = touchStartY - touchEndY;

      if (currentPanel === "landing" && landingEl !== null && landingEl.scrollTop > 0) {
        return;
      }

      const next = getNextPanelFromDelta({
        currentPanel,
        deltaY,
        isDesktop: true,
      });
      if (next !== currentPanel) {
        setPanel(next);
      }
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
    const scrollToGame = () => {
      setPanel("game");
      const landingEl = landingScrollRef.current;
      if (landingEl !== null) {
        landingEl.scrollTop = 0;
      }
    };
    window.addEventListener(HOME_LANDING_SCROLL_EVENT, scrollToGame);
    return () => window.removeEventListener(HOME_LANDING_SCROLL_EVENT, scrollToGame);
  }, []);

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

  return (
    <div style={{ height: "100vh", overflow: isDesktop ? "hidden" : undefined }}>
      <div
        style={{
          transform: isDesktop ? `translateY(${offset})` : undefined,
          transition: isDesktop ? "transform 260ms ease" : undefined,
        }}
      >
        <div style={{ minHeight: "100vh" }}>
          <GameShell />
        </div>
        {isDesktop && isLandingReady ? (
          <div
            ref={landingScrollRef}
            style={{
              height: "100vh",
              overflowY: "auto",
              overflowX: "hidden",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <HomeLanding />
          </div>
        ) : null}
      </div>
    </div>
  );
}
