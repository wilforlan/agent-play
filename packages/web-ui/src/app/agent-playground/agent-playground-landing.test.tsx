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

import { MAIN_WORLD_ORIGIN } from "@/lib/main-world";

import {
  AGENT_PLAYGROUND_AGENT_PROMPT,
  AGENT_PLAYGROUND_MIGRATION,
} from "./agent-playground-content";
import { AgentPlaygroundAqlPage } from "./agent-playground-aql";
import { AgentPlaygroundChrome } from "./agent-playground-chrome";
import { AgentPlaygroundLanding } from "./agent-playground-landing";

describe("Agent Playground pages", () => {
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

  it("renders the Main World landing with playground and AQL destinations", () => {
    mount(
      <AgentPlaygroundChrome>
        <AgentPlaygroundLanding />
      </AgentPlaygroundChrome>,
    );

    expect(container.querySelector("h1")?.textContent).toBe(
      "Interactive World Platform for AI Agents",
    );
    expect(container.textContent).toContain(MAIN_WORLD_ORIGIN);
    expect(container.textContent).not.toContain("agentplayground.com.sg");
    expect(
      container.querySelector(`a[href="${MAIN_WORLD_ORIGIN}"]`),
    ).not.toBeNull();
    expect(container.querySelector('a[href="/playground"]')).not.toBeNull();
    expect(
      container.querySelector('a[href="/agent-playground/aql"]'),
    ).not.toBeNull();
    expect(
      container.querySelector(
        'a[href="https://wilforlan.github.io/agent-play/"]',
      ),
    ).not.toBeNull();
  });

  it("shows credential migration from agent-play.com to world1.v0peer.org", () => {
    mount(<AgentPlaygroundLanding />);

    const migration = container.querySelector("#migration");
    expect(migration).not.toBeNull();
    expect(migration?.textContent).toContain(AGENT_PLAYGROUND_MIGRATION.title);
    expect(migration?.textContent).toContain("agent-play.com");
    expect(migration?.textContent).toContain("world1.v0peer.org");
    expect(migration?.textContent).toContain("credentials.json");
  });

  it("offers a copyable agent prompt aimed at Main World", () => {
    mount(<AgentPlaygroundLanding />);

    expect(container.textContent).toContain(AGENT_PLAYGROUND_AGENT_PROMPT);
    expect(
      container.querySelector("button")?.textContent,
    ).toMatch(/copy prompt/i);
  });

  it("documents AQL against world1.v0peer.org and links the editor", () => {
    mount(<AgentPlaygroundAqlPage />);

    expect(container.querySelector("h1")?.textContent).toMatch(/AQL/i);
    expect(container.textContent).toContain(
      `CONNECT SERVER "${MAIN_WORLD_ORIGIN}"`,
    );
    expect(container.querySelector('a[href="/playground"]')).not.toBeNull();
    expect(
      container.querySelector('a[href="/doc/aql/language-reference"]'),
    ).not.toBeNull();
    expect(container.textContent).not.toContain("agentplayground.com.sg");
  });
});
