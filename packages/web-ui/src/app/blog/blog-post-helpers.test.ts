import { describe, expect, it } from "vitest";

import type { BlogPostPreview } from "@/lib/sanity-blog";

import {
  BLOG_POST_CTAS,
  pickRecentBlogPosts,
  resolveBlogAuthorDisplay,
} from "./blog-post-helpers";

const getMockPreview = (
  overrides?: Partial<BlogPostPreview>,
): BlogPostPreview => ({
  id: "post-1",
  title: "Example post",
  slug: "example-post",
  excerpt: "",
  featured: false,
  categories: [],
  publishedAt: "2026-04-28T18:00:00.000Z",
  image: { url: null, alt: "" },
  author: null,
  ...overrides,
});

describe("pickRecentBlogPosts", () => {
  it("returns up to five recent posts excluding the current slug", () => {
    const posts = [
      getMockPreview({ id: "1", slug: "current", title: "Current" }),
      getMockPreview({ id: "2", slug: "a", title: "A" }),
      getMockPreview({ id: "3", slug: "b", title: "B" }),
      getMockPreview({ id: "4", slug: "c", title: "C" }),
      getMockPreview({ id: "5", slug: "d", title: "D" }),
      getMockPreview({ id: "6", slug: "e", title: "E" }),
      getMockPreview({ id: "7", slug: "f", title: "F" }),
    ];

    const recent = pickRecentBlogPosts({
      posts,
      currentSlug: "current",
      limit: 5,
    });

    expect(recent.map((post) => post.slug)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("returns fewer than five when not enough other posts exist", () => {
    const posts = [
      getMockPreview({ id: "1", slug: "only", title: "Only" }),
      getMockPreview({ id: "2", slug: "other", title: "Other" }),
    ];

    const recent = pickRecentBlogPosts({
      posts,
      currentSlug: "only",
      limit: 5,
    });

    expect(recent.map((post) => post.slug)).toEqual(["other"]);
  });

  it("defaults the limit to five", () => {
    const posts = Array.from({ length: 8 }, (_, index) =>
      getMockPreview({
        id: String(index),
        slug: `post-${String(index)}`,
        title: `Post ${String(index)}`,
      }),
    );

    const recent = pickRecentBlogPosts({
      posts,
      currentSlug: "post-0",
    });

    expect(recent).toHaveLength(5);
  });
});

describe("resolveBlogAuthorDisplay", () => {
  it("uses the sanity author name when present", () => {
    expect(
      resolveBlogAuthorDisplay({
        name: "Ada Lovelace",
        pictureUrl: "https://cdn.example/ada.jpg",
      }),
    ).toEqual({
      name: "Ada Lovelace",
      pictureUrl: "https://cdn.example/ada.jpg",
    });
  });

  it("falls back to Agent Play team when author is missing", () => {
    expect(resolveBlogAuthorDisplay(null)).toEqual({
      name: "Agent Play team",
      pictureUrl: null,
    });
  });

  it("falls back when author name is blank", () => {
    expect(
      resolveBlogAuthorDisplay({
        name: "   ",
        pictureUrl: null,
      }),
    ).toEqual({
      name: "Agent Play team",
      pictureUrl: null,
    });
  });
});

describe("BLOG_POST_CTAS", () => {
  it("exposes product CTAs with known routes and marketing URLs", () => {
    expect(BLOG_POST_CTAS).toEqual([
      { label: "Open Scanner", href: "/scanner", external: false },
      {
        label: "Trade on Econext",
        href: "https://econext.llc/trade",
        external: true,
      },
      {
        label: "Buy APU",
        href: "https://econext.llc/earn/apu",
        external: true,
      },
      { label: "v0peer.org", href: "https://v0peer.org", external: true },
      {
        label: "Star on Github",
        href: "https://github.com/wilforlan/agent-play",
        external: true,
      },
    ]);
  });
});

