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

vi.mock("@agent-play/node-tools/browser", () => ({
  nodeCredentialsMaterialFromHumanPassphrase: (passw: string) =>
    `hash:${passw}`,
}));

import { MAIN_WORLD_ORIGIN } from "@/lib/main-world";

import { AgentPlay } from "./agent-play";
import {
  AGENT_PLAY_CATEGORIES,
  AGENT_PLAY_CLI_SHOTS,
  AGENT_PLAY_FEATURED_AGENT,
  AGENT_PLAY_FIRST_AGENT_STEPS,
  AGENT_PLAY_LOGIN_WORKSPACE,
  AGENT_PLAY_ORGANIZATIONS_SECTION,
  AGENT_PLAY_WORLD_SURFACES,
  getAgentPlaySitePage,
} from "./agent-play-content";
import {
  AGENT_PLAY_HELP_ARTICLES,
  AGENT_PLAY_HELP_HUB,
  agentPlayHelpHref,
} from "./agent-play-help-content";
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
    expect(container.textContent).not.toContain("Marketplace Analytics");
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

  it("loads registered organizations in a section on the categories page", async () => {
    const categories = getAgentPlaySitePage(["categories"]);
    expect(categories).toBeDefined();
    if (categories === undefined) {
      throw new Error("categories page missing");
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        organizations: [
          {
            nodeId: "org-node-1",
            organizationName: "Northwind Agents",
            website: "https://northwind.test",
            details: "Helpdesk and onboarding agents",
            createdAt: "2026-08-19T22:00:00.000Z",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    mount(<AgentPlaySubpage page={categories} />);

    const section = container.querySelector(
      'section[aria-labelledby="organizations-title"]',
    );
    expect(section).not.toBeNull();
    expect(section?.textContent).toContain(
      AGENT_PLAY_ORGANIZATIONS_SECTION.title,
    );

    await vi.waitFor(() => {
      expect(section?.textContent).toContain("Northwind Agents");
    });
    expect(section?.textContent).toContain("Helpdesk and onboarding agents");
    expect(
      section?.querySelector('a[href="https://northwind.test"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain(AGENT_PLAY_CATEGORIES[1]);
    expect(fetchMock).toHaveBeenCalledWith(
      AGENT_PLAY_ORGANIZATIONS_SECTION.listHref,
    );
  });

  it("loads registered organizations in a section on the agents catalog", async () => {
    const agents = getAgentPlaySitePage(["agents"]);
    expect(agents).toBeDefined();
    if (agents === undefined) {
      throw new Error("agents page missing");
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        organizations: [
          {
            nodeId: "org-node-1",
            organizationName: "Northwind Agents",
            website: "https://northwind.test",
            details: "Helpdesk and onboarding agents",
            createdAt: "2026-08-19T22:00:00.000Z",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    mount(<AgentPlaySubpage page={agents} />);

    const section = container.querySelector(
      'section[aria-labelledby="organizations-title"]',
    );
    expect(section).not.toBeNull();
    expect(section?.textContent).toContain(
      AGENT_PLAY_ORGANIZATIONS_SECTION.title,
    );

    await vi.waitFor(() => {
      expect(section?.textContent).toContain("Northwind Agents");
    });
    expect(section?.textContent).toContain("Helpdesk and onboarding agents");
    expect(
      section?.querySelector('a[href="https://northwind.test"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("IT Helpdesk Agent");
    expect(JSON.stringify(section?.textContent)).not.toContain(
      "ops@northwind.test",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      AGENT_PLAY_ORGANIZATIONS_SECTION.listHref,
    );
  });

  it("restores a publisher workspace from credentials and lists agent earnings", async () => {
    const login = getAgentPlaySitePage(["login"]);
    expect(login).toBeDefined();
    if (login === undefined) {
      throw new Error("login page missing");
    }

    const passphrase =
      "alpha bravo charlie delta echo foxtrot golf hotel india juliet";
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === AGENT_PLAY_LOGIN_WORKSPACE.validateHref) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, nodeKind: "main" }),
        };
      }
      if (url === AGENT_PLAY_LOGIN_WORKSPACE.nodesHref) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            mainNode: {
              nodeId: "org-node-1",
              kind: "main",
              createdAt: "2026-08-19T22:00:00.000Z",
              agentNodeIds: ["agt-helpdesk"],
            },
            agentNodes: [
              {
                agentId: "agt-helpdesk",
                name: "IT Helpdesk Agent",
                toolNames: ["ticket"],
                zoneCount: 4,
                yieldCount: 12,
                flagged: false,
                createdAt: "2026-08-19T22:00:00.000Z",
                updatedAt: "2026-08-19T22:00:00.000Z",
              },
            ],
          }),
        };
      }
      if (
        typeof url === "string" &&
        url.startsWith(AGENT_PLAY_LOGIN_WORKSPACE.agentsHref) &&
        init?.method === "DELETE"
      ) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
        };
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: "not found" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    mount(<AgentPlaySubpage page={login} />);

    expect(container.querySelector('input[type="file"]')).not.toBeNull();
    expect(container.querySelector('input[name="email"]')).toBeNull();
    expect(container.querySelector('input[name="password"]')).toBeNull();
    expect(container.textContent).toContain(
      AGENT_PLAY_LOGIN_WORKSPACE.firstAgentTitle,
    );
    for (const step of AGENT_PLAY_FIRST_AGENT_STEPS) {
      expect(container.textContent).toContain(step.title);
    }
    for (const shot of AGENT_PLAY_CLI_SHOTS) {
      const frame = container.querySelector(
        `[aria-label="${shot.title}"]`,
      );
      expect(frame).not.toBeNull();
      expect(frame?.textContent).toContain(shot.lines[0]?.text);
    }
    expect(container.querySelector('a[href="/doc/cli"]')).not.toBeNull();

    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    expect(fileInput).not.toBeNull();
    if (fileInput === null) {
      throw new Error("credentials file input missing");
    }

    const file = new File(
      [
        JSON.stringify({
          serverUrl: "https://agent-play.com",
          nodeId: "org-node-1",
          passw: passphrase,
        }),
      ],
      "credentials.json",
      { type: "application/json" },
    );
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [file],
    });

    await act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const restore = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement | null;
    expect(restore).not.toBeNull();
    if (restore === null) {
      throw new Error("restore button missing");
    }

    await act(async () => {
      restore.click();
    });

    await vi.waitFor(() => {
      expect(container.textContent).toContain("IT Helpdesk Agent");
    });
    expect(container.textContent).toContain(
      AGENT_PLAY_LOGIN_WORKSPACE.agentsTitle,
    );
    expect(container.textContent).toContain(
      AGENT_PLAY_LOGIN_WORKSPACE.yieldLabel,
    );
    expect(container.textContent).toContain("12");
    expect(container.textContent).toContain(
      AGENT_PLAY_LOGIN_WORKSPACE.manageTitle,
    );
    expect(container.textContent).not.toContain(passphrase);
    const validateCall = fetchMock.mock.calls.find(
      (call) => call[0] === AGENT_PLAY_LOGIN_WORKSPACE.validateHref,
    );
    expect(validateCall).toBeDefined();
    const validateHeaders = (validateCall?.[1] as RequestInit | undefined)
      ?.headers as Record<string, string> | undefined;
    expect(validateHeaders?.["x-node-id"]).toBe("org-node-1");
    expect(validateHeaders?.["x-node-passw"]).toBe(`hash:${passphrase}`);

    const remove = Array.from(container.querySelectorAll("button")).find(
      (button) =>
        button.textContent === AGENT_PLAY_LOGIN_WORKSPACE.deleteAgentCta,
    );
    expect(remove).toBeDefined();
    await act(async () => {
      remove?.click();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${AGENT_PLAY_LOGIN_WORKSPACE.agentsHref}?id=agt-helpdesk`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("lists Agent Developer help articles on the help center and opens one", () => {
    const hub = getAgentPlaySitePage(["help"]);
    expect(hub).toBeDefined();
    if (hub === undefined) {
      throw new Error("help page missing");
    }

    mount(<AgentPlaySubpage page={hub} />);

    expect(container.querySelector("h1")?.textContent).toBe(
      AGENT_PLAY_HELP_HUB.title,
    );
    expect(container.textContent).toContain(
      AGENT_PLAY_HELP_HUB.developerIndexTitle,
    );
    expect(container.textContent).toContain("Buyers");
    expect(container.textContent).toContain("Publishers");
    for (const article of AGENT_PLAY_HELP_ARTICLES) {
      expect(container.textContent).toContain(article.title);
      expect(
        container.querySelector(`a[href="${agentPlayHelpHref(article.slug)}"]`),
      ).not.toBeNull();
    }

    const gettingStarted = getAgentPlaySitePage(["help", "getting-started"]);
    expect(gettingStarted).toBeDefined();
    if (gettingStarted === undefined) {
      throw new Error("getting-started help article missing");
    }

    act(() => {
      root.render(<AgentPlaySubpage page={gettingStarted} />);
    });

    expect(container.querySelector("h1")?.textContent).toBe(
      gettingStarted.title,
    );
    expect(container.querySelector('a[href="/agent-play/help"]')).not.toBeNull();
    expect(container.textContent).toContain(
      gettingStarted.sections?.[0]?.title ?? "",
    );
  });
});
