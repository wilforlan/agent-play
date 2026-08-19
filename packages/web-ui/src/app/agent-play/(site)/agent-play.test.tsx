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

vi.mock("next/navigation", () => ({
  usePathname: () => "/agent-play",
}));

import { MAIN_WORLD_ORIGIN } from "@/lib/main-world";

import { AgentPlay } from "./agent-play";
import {
  AGENT_PLAY_CATEGORIES,
  AGENT_PLAY_FEATURED_AGENT,
  AGENT_PLAY_WORLD_SURFACES,
  getAgentPlaySitePage,
} from "./agent-play-content";
import { AgentPlayLanding } from "./agent-play-landing";
import { AgentPlaySubpage } from "./agent-play-subpage";

describe("Agent Play parent landing", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("renders Agent Play chrome around child pages", () => {
    mount(
      <AgentPlay>
        <main>landing body</main>
      </AgentPlay>,
    );

    expect(container.textContent).toContain("Agent Play");
    expect(container.textContent).not.toContain("by OB360");
    const nav = container.querySelector('nav[aria-label="Agent Play"]');
    expect(nav).not.toBeNull();
    expect(nav?.querySelector('a[href="/agent-play/marketplace"]')?.textContent).toBe(
      "Marketplace",
    );
    expect(nav?.querySelector('a[href="/agent-play/register"]')?.textContent).toBe(
      "Register Organization",
    );
    const worldsNav = container.querySelector('nav[aria-label="Worlds"]');
    expect(worldsNav).not.toBeNull();
    expect(worldsNav?.querySelector('a[href="/playground"]')?.textContent).toBe(
      "Playground",
    );
    expect(
      worldsNav?.querySelector('a[href="/agent-playground"]')?.textContent,
    ).toBe("Agent Playground");
    expect(worldsNav?.querySelector('a[href="/games"]')?.textContent).toBe(
      "Agent Play Games",
    );
    expect(
      worldsNav?.querySelector(`a[href="${MAIN_WORLD_ORIGIN}"]`)?.textContent,
    ).toBe("Main World");
    expect(
      worldsNav
        ?.querySelector(`a[href="${MAIN_WORLD_ORIGIN}"]`)
        ?.getAttribute("target"),
    ).toBe("_blank");
    expect(container.textContent).toContain("Product");
    expect(container.textContent).toContain("For Publishers");
    expect(container.textContent).toContain(
      "© 2026 Viroke Technologies Inc (a Delaware US corporation). All rights reserved.",
    );
    expect(container.textContent).toContain("landing body");
  });

  it("shows the parent landing marketplace sections", () => {
    mount(<AgentPlayLanding />);

    expect(container.textContent).toContain(
      "The Enterprise Marketplace for AI Agents",
    );
    expect(
      container.querySelector('a[href="/agent-play/agents"]')?.textContent,
    ).toContain("Explore Agents");
    expect(
      container.querySelector('a[href="/agent-play/register"]')?.textContent,
    ).toContain("Become a Publisher");
    expect(container.textContent).toContain(AGENT_PLAY_FEATURED_AGENT.name);
    expect(container.textContent).not.toContain("OB360");
    expect(container.textContent).toContain("Marketplace Analytics");
    expect(container.textContent).toContain("How Agent Play Works");
    const worldsSection = container.querySelector(
      'section[aria-labelledby="worlds-title"]',
    );
    expect(worldsSection).not.toBeNull();
    for (const surface of AGENT_PLAY_WORLD_SURFACES) {
      expect(worldsSection?.textContent).toContain(surface.title);
      expect(worldsSection?.textContent).toContain(surface.body);
      expect(
        worldsSection?.querySelector(`a[href="${surface.href}"]`)?.textContent,
      ).toContain(surface.label);
    }
    expect(container.textContent).toContain("Built for Discovery, Publishing, and Growth");
    expect(container.textContent).toContain("No featured agents available yet.");
    for (const category of AGENT_PLAY_CATEGORIES) {
      expect(container.textContent).toContain(category);
    }
  });

  it("renders marketplace, analytics, and how-it-works subpages from the catalog", () => {
    const marketplace = getAgentPlaySitePage(["marketplace"]);
    const analytics = getAgentPlaySitePage(["analytics"]);
    const howItWorks = getAgentPlaySitePage(["how-it-works"]);
    expect(marketplace).toBeDefined();
    expect(analytics).toBeDefined();
    expect(howItWorks).toBeDefined();
    if (
      marketplace === undefined ||
      analytics === undefined ||
      howItWorks === undefined
    ) {
      throw new Error("required marketplace pages missing");
    }

    mount(<AgentPlaySubpage page={marketplace} />);
    expect(container.textContent).toContain("Featured Agent");
    expect(container.textContent).toContain("IT Helpdesk Agent");

    act(() => {
      root.render(<AgentPlaySubpage page={analytics} />);
    });
    expect(container.textContent).toContain("Actionable Marketplace Analytics");
    expect(container.textContent).toContain("Healthcare Navigation Assistant");

    act(() => {
      root.render(<AgentPlaySubpage page={howItWorks} />);
    });
    expect(container.textContent).toContain("Register Organization");
    expect(container.textContent).toContain("Initialize with the CLI");
    expect(container.textContent).toContain("Host agents in the world");
    expect(container.textContent).toContain("Talk time");
    expect(container.textContent).toContain("How organizations earn");
  });

  it("registers the organization, offers credential download, and points to CLI docs", async () => {
    const register = getAgentPlaySitePage(["register"]);
    expect(register).toBeDefined();
    if (register === undefined) {
      throw new Error("register page missing");
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        organization: {
          organizationName: "Northwind Agents",
          email: "ops@northwind.test",
          website: "",
          details: "",
          nodeId: "org-node-1",
          createdAt: "2026-08-19T22:00:00.000Z",
        },
        credentials: {
          serverUrl: "https://agent-play.com",
          nodeId: "org-node-1",
          passw: "alpha bravo charlie delta echo foxtrot golf hotel india juliet",
        },
        nextSteps: {
          cliDocHref: "/doc/cli",
          initializeDocHref: "/doc/initialize-agent-server-and-template",
          installCommand: "npx agent-play initialize",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    mount(<AgentPlaySubpage page={register} />);

    const name = container.querySelector(
      'input[name="organizationName"]',
    ) as HTMLInputElement | null;
    const email = container.querySelector(
      'input[name="email"]',
    ) as HTMLInputElement | null;
    const form = container.querySelector("form");
    expect(name).not.toBeNull();
    expect(email).not.toBeNull();
    expect(form).not.toBeNull();
    if (name === null || email === null || form === null) {
      throw new Error("register form missing");
    }

    await act(async () => {
      name.value = "Northwind Agents";
      name.dispatchEvent(new Event("input", { bubbles: true }));
      email.value = "ops@northwind.test";
      email.dispatchEvent(new Event("input", { bubbles: true }));
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain("Download credentials.json");
    });
    expect(container.querySelector('a[href="/doc/cli"]')).not.toBeNull();
    expect(
      container.querySelector(
        'a[href="/doc/initialize-agent-server-and-template"]',
      ),
    ).not.toBeNull();
    expect(container.textContent).toContain("Talk time");
    expect(container.textContent).toContain("Human-in-the-loop actions");
    expect(container.textContent).toContain("How organizations earn");
  });
});
