/** @vitest-environment happy-dom */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => <img src={src} alt={alt} className={className} />,
}));

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

import { BlogNewsroomChrome } from "./blog-newsroom-chrome";

describe("BlogNewsroomChrome", () => {
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

  it("renders updated nav labels without Newsroom or GitHub", () => {
    mount(
      <BlogNewsroomChrome>
        <main>content</main>
      </BlogNewsroomChrome>,
    );

    const nav = container.querySelector('nav[aria-label="Primary"]');
    expect(nav).not.toBeNull();
    expect(nav?.textContent).toContain("Playworld");
    expect(nav?.textContent).toContain("Documentation");
    expect(nav?.textContent).toContain("Playground");
    expect(nav?.textContent).toContain("AQL Playground");
    expect(nav?.textContent).not.toContain("Newsroom");
    expect(nav?.textContent).not.toContain("GitHub");
    expect(nav?.textContent).not.toContain("Home");
    expect(nav?.textContent).not.toContain("Docs");
    expect(nav?.querySelector('a[href="/"]')?.textContent).toBe("Playworld");
    expect(nav?.querySelector('a[href="/doc"]')?.textContent).toBe(
      "Documentation",
    );
    expect(nav?.querySelector('a[href="/agent-playground"]')?.textContent).toBe(
      "Playground",
    );
    expect(nav?.querySelector('a[href="/playground"]')?.textContent).toBe(
      "AQL Playground",
    );
  });

  it("shows the logo in a round container without Newsroom under the logo", () => {
    mount(
      <BlogNewsroomChrome>
        <main>content</main>
      </BlogNewsroomChrome>,
    );

    const logo = container.querySelector('img[alt="Agent Play"]');
    expect(logo?.getAttribute("src")).toBe("/agent-play-logo.png");
    expect(logo?.parentElement?.className).toContain("rounded-full");
    expect(logo?.parentElement?.className).toContain("overflow-hidden");
    expect(container.textContent).not.toMatch(/Newsroom/);
  });
});
