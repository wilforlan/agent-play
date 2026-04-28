import { afterEach, describe, expect, it, vi } from "vitest";

const { sanityFetch } = vi.hoisted(() => ({
  sanityFetch: vi.fn(),
}));

const { urlForImage } = vi.hoisted(() => ({
  urlForImage: vi.fn(),
}));

vi.mock("@/sanity/lib/fetch", () => ({
  sanityFetch,
}));

vi.mock("@/sanity/lib/utils", () => ({
  urlForImage,
}));

import {
  buildBlogSections,
  buildSanityImageUrl,
  getBlogPostBySlug,
  getBlogPosts,
} from "./sanity-blog";

const originalEnv = { ...process.env };

describe("sanity blog content", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it("returns empty posts when sanity env is not configured", async () => {
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "";
    process.env.NEXT_PUBLIC_SANITY_DATASET = "";
    process.env.NEXT_PUBLIC_SANITY_API_VERSION = "";

    const posts = await getBlogPosts();

    expect(posts).toEqual([]);
  });

  it("fetches blog posts from sanity and maps fields", async () => {
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "project123";
    process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
    sanityFetch.mockResolvedValue([
      {
        _id: "post-1",
        title: "Hello world",
        slug: "hello-world",
        excerpt: "Summary",
        content: [],
        publishedAt: "2026-04-28T18:00:00.000Z",
        featured: true,
        categories: [{ title: "Engineering", slug: "engineering" }],
        mainImage: { _type: "image", alt: "Hero image" },
      },
    ]);
    urlForImage.mockReturnValue({
      url: () => "https://cdn.sanity.io/images/project123/production/abc-1200x630.png",
    });

    const posts = await getBlogPosts();

    expect(posts).toEqual([
      {
        id: "post-1",
        title: "Hello world",
        slug: "hello-world",
        excerpt: "Summary",
        publishedAt: "2026-04-28T18:00:00.000Z",
        featured: true,
        categories: [{ title: "Engineering", slug: "engineering" }],
        image: {
          url: "https://cdn.sanity.io/images/project123/production/abc-1200x630.png",
          alt: "Hero image",
        },
      },
    ]);
    expect(sanityFetch).toHaveBeenCalledTimes(1);
  });

  it("fetches a single blog post by slug", async () => {
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "project123";
    process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
    sanityFetch.mockResolvedValue({
      _id: "post-2",
      title: "Second post",
      slug: "second-post",
      content: [
        {
          _type: "block",
          children: [{ _type: "span", text: "Body copy" }],
        },
      ],
      excerpt: "",
      publishedAt: "2026-04-27T18:00:00.000Z",
      featured: false,
      categories: [],
      mainImage: null,
    });
    urlForImage.mockReturnValue(undefined);

    const post = await getBlogPostBySlug({ slug: "second-post" });

    expect(post?.slug).toBe("second-post");
    expect(post?.body?.[0]?._type).toBe("block");
  });

  it("builds image URL from sanity asset ref", () => {
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "project123";
    process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
    urlForImage.mockReturnValue({
      url: () => "https://cdn.sanity.io/images/project123/production/abc-1200x630.webp",
    });

    const url = buildSanityImageUrl({
      assetRef: "image-abc-1200x630-webp",
    });

    expect(url).toBe(
      "https://cdn.sanity.io/images/project123/production/abc-1200x630.webp",
    );
  });

  it("builds featured, recent and category sections", () => {
    const sections = buildBlogSections({
      posts: [
        {
          id: "1",
          title: "Latest product launch",
          slug: "latest-product-launch",
          excerpt: "Launch details",
          publishedAt: "2026-04-28T18:00:00.000Z",
          featured: false,
          categories: [{ title: "Product", slug: "product" }],
          image: { url: null, alt: "" },
        },
        {
          id: "2",
          title: "Security update",
          slug: "security-update",
          excerpt: "Security details",
          publishedAt: "2026-04-26T18:00:00.000Z",
          featured: true,
          categories: [{ title: "Security", slug: "security" }],
          image: { url: null, alt: "" },
        },
        {
          id: "3",
          title: "Roadmap update",
          slug: "roadmap-update",
          excerpt: "Roadmap details",
          publishedAt: "2026-04-25T18:00:00.000Z",
          featured: false,
          categories: [{ title: "Product", slug: "product" }],
          image: { url: null, alt: "" },
        },
      ],
    });

    expect(sections.featured?.id).toBe("2");
    expect(sections.recent.map((post) => post.id)).toEqual(["1", "3"]);
    expect(sections.categories[0]?.name).toBe("Security");
    expect(sections.categories[0]?.posts.map((post) => post.id)).toEqual(["2"]);
    expect(sections.categories[1]?.name).toBe("Product");
    expect(sections.categories[1]?.posts.map((post) => post.id)).toEqual(["1", "3"]);
  });
});
