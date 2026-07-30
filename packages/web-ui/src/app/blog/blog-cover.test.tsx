/** @vitest-environment happy-dom */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onError,
    className,
  }: {
    src: string;
    alt: string;
    onError?: () => void;
    className?: string;
  }) => <img src={src} alt={alt} onError={onError} className={className} />,
}));

import { BlogCover } from "./blog-cover";

describe("BlogCover", () => {
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

  it("shows title initials on the dark fallback when the cover image URL is missing", () => {
    mount(<BlogCover src={null} alt="Story cover" title="Chat with HR" />);

    expect(
      container.querySelector('[data-testid="blog-cover-fallback"]'),
    ).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("CW");
  });

  it("shows title initials on the dark fallback when the cover image fails to load", () => {
    mount(
      <BlogCover
        src="https://cdn.sanity.io/images/project/cover.jpg"
        alt="Story cover"
        title="Meeting Legal"
      />,
    );

    const image = container.querySelector("img");
    expect(image).not.toBeNull();

    act(() => {
      image?.dispatchEvent(new Event("error"));
    });

    expect(
      container.querySelector('[data-testid="blog-cover-fallback"]'),
    ).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("ML");
  });
});
