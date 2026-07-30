import { describe, expect, it } from "vitest";

import {
  buildBlogPostMetadata,
  portableTextToPlainSummary,
  resolveBlogPostDescription,
  resolveBlogPostOgImageUrl,
} from "./blog-post-metadata";

const longBody = [
  {
    _type: "block",
    style: "normal",
    children: [
      {
        _type: "span",
        text: "Agent Play lets teams walk a shared spatial map with AI agents and collaborate in real time across rooms.",
      },
    ],
  },
  {
    _type: "block",
    style: "normal",
    children: [
      {
        _type: "span",
        text: "This second paragraph continues the story with more detail about meetings, scanners, and live presence.",
      },
    ],
  },
];

describe("portableTextToPlainSummary", () => {
  it("joins meaningful paragraph text and truncates near the limit", () => {
    const summary = portableTextToPlainSummary({
      body: longBody,
      maxLength: 160,
    });

    expect(summary.length).toBeGreaterThan(0);
    expect(summary.length).toBeLessThanOrEqual(160);
    expect(summary.startsWith("Agent Play lets teams")).toBe(true);
    expect(summary.includes("…") || summary.length <= 160).toBe(true);
  });

  it("skips empty blocks and non-text nodes", () => {
    const summary = portableTextToPlainSummary({
      body: [
        { _type: "image", asset: { _ref: "image-1" } },
        {
          _type: "block",
          style: "normal",
          children: [{ _type: "span", text: "   " }],
        },
        {
          _type: "block",
          style: "h2",
          children: [{ _type: "span", text: "Skip headings for summary" }],
        },
        {
          _type: "block",
          style: "normal",
          children: [
            { _type: "span", text: "First real " },
            { _type: "span", text: "paragraph." },
          ],
        },
      ],
    });

    expect(summary).toBe("First real paragraph.");
  });

  it("returns empty string when body has no usable text", () => {
    expect(portableTextToPlainSummary({ body: [] })).toBe("");
    expect(portableTextToPlainSummary({ body: null })).toBe("");
  });
});

describe("resolveBlogPostDescription", () => {
  it("prefers excerpt when present", () => {
    expect(
      resolveBlogPostDescription({
        excerpt: "  Custom excerpt for sharing.  ",
        body: longBody,
      }),
    ).toBe("Custom excerpt for sharing.");
  });

  it("falls back to a plain-text body summary when excerpt is empty", () => {
    const description = resolveBlogPostDescription({
      excerpt: "",
      body: longBody,
      maxLength: 180,
    });

    expect(description.startsWith("Agent Play lets teams")).toBe(true);
    expect(description.length).toBeLessThanOrEqual(180);
  });
});

describe("resolveBlogPostOgImageUrl", () => {
  it("returns absolute cover image URLs unchanged", () => {
    expect(
      resolveBlogPostOgImageUrl({
        coverImageUrl:
          "https://cdn.sanity.io/images/project/production/cover-1200x630.png",
        siteOrigin: "https://agent-play.com",
      }),
    ).toBe(
      "https://cdn.sanity.io/images/project/production/cover-1200x630.png",
    );
  });

  it("absolutizes relative cover paths against the site origin", () => {
    expect(
      resolveBlogPostOgImageUrl({
        coverImageUrl: "/covers/post.png",
        siteOrigin: "https://agent-play.com",
      }),
    ).toBe("https://agent-play.com/covers/post.png");
  });

  it("omits image when cover is missing", () => {
    expect(
      resolveBlogPostOgImageUrl({
        coverImageUrl: null,
        siteOrigin: "https://agent-play.com",
      }),
    ).toBeUndefined();
  });

  it("uses site fallback only when cover is missing and fallback is provided", () => {
    expect(
      resolveBlogPostOgImageUrl({
        coverImageUrl: null,
        siteOrigin: "https://agent-play.com",
        fallbackImagePath: "/agent-play-logo.png",
      }),
    ).toBe("https://agent-play.com/agent-play-logo.png");
  });
});

describe("buildBlogPostMetadata", () => {
  it("builds per-post open graph and twitter metadata with article type", () => {
    const metadata = buildBlogPostMetadata({
      title: "Meeting with a legal assistant",
      slug: "meeting-with-legal-assistant",
      excerpt: "A walkthrough of chatting with legal help on Agent Play.",
      body: longBody,
      imageUrl:
        "https://cdn.sanity.io/images/project/production/cover-1200x630.png",
      imageAlt: "Legal assistant cover",
      siteOrigin: "https://agent-play.com",
      siteName: "Agent Play",
    });

    expect(metadata).toMatchObject({
      title: "Meeting with a legal assistant",
      description: "A walkthrough of chatting with legal help on Agent Play.",
      alternates: {
        canonical: "https://agent-play.com/blog/meeting-with-legal-assistant",
      },
      openGraph: {
        title: "Meeting with a legal assistant",
        description:
          "A walkthrough of chatting with legal help on Agent Play.",
        url: "https://agent-play.com/blog/meeting-with-legal-assistant",
        type: "article",
        siteName: "Agent Play",
        images: [
          {
            url: "https://cdn.sanity.io/images/project/production/cover-1200x630.png",
            alt: "Legal assistant cover",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Meeting with a legal assistant",
        description:
          "A walkthrough of chatting with legal help on Agent Play.",
        images: [
          "https://cdn.sanity.io/images/project/production/cover-1200x630.png",
        ],
      },
    });
  });

  it("uses body summary and summary card when excerpt and cover are missing", () => {
    const metadata = buildBlogPostMetadata({
      title: "Body only post",
      slug: "body-only",
      excerpt: "",
      body: [
        {
          _type: "block",
          style: "normal",
          children: [{ _type: "span", text: "Derived from portable text body." }],
        },
      ],
      imageUrl: null,
      siteOrigin: "https://agent-play.com",
    });

    expect(metadata.description).toBe("Derived from portable text body.");
    expect(metadata.openGraph).toMatchObject({
      title: "Body only post",
      description: "Derived from portable text body.",
      type: "article",
      url: "https://agent-play.com/blog/body-only",
    });
    expect(metadata.openGraph?.images).toBeUndefined();
    expect(metadata.twitter).toMatchObject({
      card: "summary",
      title: "Body only post",
      description: "Derived from portable text body.",
    });
    expect(metadata.twitter?.images).toBeUndefined();
  });
});
