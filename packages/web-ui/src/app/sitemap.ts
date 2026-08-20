import type { MetadataRoute } from "next";

import {
  buildAgentPlaySitemap,
  resolveAgentPlayOrigin,
} from "@/lib/agent-play-seo";
import { listMarkdownRelativePaths } from "@/lib/docs/list-markdown";
import { getBlogPosts } from "@/lib/sanity-blog";

const listBlogSlugs = async (): Promise<string[]> => {
  try {
    const posts = await getBlogPosts();
    return posts.map((post) => post.slug);
  } catch {
    return [];
  }
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = resolveAgentPlayOrigin({
    envValue: process.env.NEXT_PUBLIC_SITE_ORIGIN,
  });
  const [blogSlugs, docRelativePaths] = await Promise.all([
    listBlogSlugs(),
    listMarkdownRelativePaths(),
  ]);

  return buildAgentPlaySitemap({
    origin,
    blogSlugs,
    docRelativePaths,
  });
}
