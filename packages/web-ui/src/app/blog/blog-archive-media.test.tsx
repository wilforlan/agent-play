/** @vitest-environment happy-dom */

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    onError,
  }: {
    src: string;
    alt: string;
    onError?: () => void;
  }) => <img src={src} alt={alt} onError={onError} />,
}));

import { BlogArchiveMedia } from "./blog-archive-media";

describe("BlogArchiveMedia", () => {
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

  it("shows a cover image preview when an image URL is available", () => {
    mount(
      <BlogArchiveMedia
        title="Chat with HR"
        imageUrl="https://cdn.sanity.io/images/project/cover.jpg"
        imageAlt="Cover"
      />,
    );

    const image = container.querySelector("img");
    expect(image?.getAttribute("src")).toBe(
      "https://cdn.sanity.io/images/project/cover.jpg",
    );
    expect(container.textContent).not.toContain("CW");
  });

  it("shows title initials avatar when no image is available", () => {
    mount(
      <BlogArchiveMedia title="Chat with HR" imageUrl={null} imageAlt="" />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("CW");
  });

  it("falls back to title initials when the cover image fails to load", () => {
    mount(
      <BlogArchiveMedia
        title="Chat with HR"
        imageUrl="https://cdn.sanity.io/images/project/cover.jpg"
        imageAlt="Cover"
      />,
    );

    const image = container.querySelector("img");
    expect(image).not.toBeNull();

    act(() => {
      image?.dispatchEvent(new Event("error"));
    });

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("CW");
  });
});
