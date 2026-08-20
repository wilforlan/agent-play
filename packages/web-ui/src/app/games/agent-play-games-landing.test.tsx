/** @vitest-environment happy-dom */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { GAME_CABINET_CATALOG } from "@agent-play/sdk";

import { AgentPlayGamesChrome } from "./agent-play-games-chrome";
import {
  AGENT_PLAY_GAMES_HERO,
  getAgentPlayGamePage,
} from "./agent-play-games-content";
import { AgentPlayGamesDetail } from "./agent-play-games-detail";
import { AgentPlayGamesLanding } from "./agent-play-games-landing";
import { AgentPlayGamesUnitsPage } from "./agent-play-games-units";

describe("Agent Play Games pages", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const mount = (node: React.ReactNode) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(node);
    });
  };

  it("renders the arcade hub with every cabinet and world-unit destinations", () => {
    mount(
      <AgentPlayGamesChrome>
        <AgentPlayGamesLanding />
      </AgentPlayGamesChrome>,
    );

    expect(container.querySelector("h1")?.textContent).toBe(
      AGENT_PLAY_GAMES_HERO.title,
    );
    expect(container.querySelector('a[href="/games/units"]')).not.toBeNull();
    expect(container.querySelector('a[href="/"]')).not.toBeNull();
    for (const cabinet of GAME_CABINET_CATALOG) {
      expect(
        container.querySelector(`a[href="/games/${cabinet.gameId}"]`),
      ).not.toBeNull();
    }
  });

  it("documents APW$ and APU earning and spending on the units page", () => {
    mount(
      <AgentPlayGamesChrome>
        <AgentPlayGamesUnitsPage />
      </AgentPlayGamesChrome>,
    );

    expect(container.querySelector("h1")?.textContent).toBe(
      "Agent Play World units",
    );
    expect(container.textContent).toContain("APW$");
    expect(container.textContent).toContain("APU");
    expect(container.textContent).toContain("150");
    expect(container.textContent).toContain("$10.00");
  });

  it("shows Hidden Gems scoring and world advantage", () => {
    const page = getAgentPlayGamePage("hidden-gems");
    expect(page).toBeDefined();
    if (page === undefined) return;

    mount(
      <AgentPlayGamesChrome>
        <AgentPlayGamesDetail page={page} />
      </AgentPlayGamesChrome>,
    );

    expect(container.querySelector("h1")?.textContent).toBe("Hidden Gems");
    expect(container.textContent).toContain("+8 APU");
    expect(container.textContent).toContain("Gem Chest");
  });
});
