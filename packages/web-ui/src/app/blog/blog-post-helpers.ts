import type { BlogPostPreview } from "@/lib/sanity-blog";

export type BlogAuthorSource = {
  name: string;
  pictureUrl: string | null;
} | null;

export type BlogAuthorDisplay = {
  name: string;
  pictureUrl: string | null;
};

export type BlogPostCta = {
  label: string;
  href: string;
  external: boolean;
};

const DEFAULT_RECENT_POST_LIMIT = 5;
const FALLBACK_AUTHOR_NAME = "Agent Play team";

export const BLOG_POST_CTAS: ReadonlyArray<BlogPostCta> = [
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
];
export const pickRecentBlogPosts = (options: {
  posts: ReadonlyArray<BlogPostPreview>;
  currentSlug: string;
  limit?: number;
}): BlogPostPreview[] => {
  const limit = options.limit ?? DEFAULT_RECENT_POST_LIMIT;

  return options.posts
    .filter((post) => post.slug !== options.currentSlug)
    .slice(0, limit);
};

export const resolveBlogAuthorDisplay = (
  author: BlogAuthorSource,
): BlogAuthorDisplay => {
  if (!author) {
    return { name: FALLBACK_AUTHOR_NAME, pictureUrl: null };
  }

  const name = author.name.trim();
  if (name.length === 0) {
    return { name: FALLBACK_AUTHOR_NAME, pictureUrl: null };
  }

  return {
    name,
    pictureUrl: author.pictureUrl,
  };
};
