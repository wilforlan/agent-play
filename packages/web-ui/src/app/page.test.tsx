/** @vitest-environment happy-dom */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./game-shell", () => ({
  default: () => <div data-testid="game-shell">game shell</div>,
}));

vi.mock("./homepage-shell", () => ({
  default: () => <div data-testid="home-page-shell">home page shell</div>,
}));

vi.mock("./home-landing", () => ({
  default: () => <div data-testid="home-landing">home landing</div>,
}));

vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => null,
}));

import HomePage from "./page";

describe("home page", () => {
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

  it("shows the game shell only", () => {
    mount(<HomePage />);

    expect(container.querySelector('[data-testid="game-shell"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="home-page-shell"]')).toBeNull();
    expect(container.querySelector('[data-testid="home-landing"]')).toBeNull();
    expect(container.textContent).toBe("game shell");
  });
});
