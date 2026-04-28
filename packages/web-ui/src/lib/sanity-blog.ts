import type { Image } from "sanity";

import { blogPostBySlugQuery, blogPostsQuery } from "@/sanity/lib/queries";
import { sanityFetch } from "@/sanity/lib/fetch";
import { urlForImage } from "@/sanity/lib/utils";

type PortableTextSpan = {
  _type?: string;
  text?: string;
};

type PortableTextBlock = {
  _type?: string;
  style?: string;
  children?: PortableTextSpan[];
};

type BlogImage = Image & { alt?: string };

type BlogPostRecord = {
  _id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  featured: boolean;
  categories: Array<{ title?: string | null; slug?: string | null }> | null;
  content: PortableTextBlock[] | null;
  publishedAt: string;
  mainImage: BlogImage | null;
};

const getImageAlt = (image: BlogImage | null): string => {
  if (!image) {
    return "";
  }
  return image.alt || "";
};

export type BlogPostPreview = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured: boolean;
  categories: Array<{ title: string; slug: string }>;
  publishedAt: string | null;
  image: {
    url: string | null;
    alt: string;
  };
};

export type BlogPost = BlogPostPreview & {
  body: PortableTextBlock[];
};

export type BlogCategorySection = {
  name: string;
  posts: BlogPostPreview[];
};

export type BlogSections = {
  featured: BlogPostPreview | null;
  recent: BlogPostPreview[];
  categories: BlogCategorySection[];
};

export const buildBlogSections = (options: { posts: BlogPostPreview[] }): BlogSections => {
  const featured = options.posts.find((post) => post.featured) ?? options.posts[0] ?? null;
  const recent = options.posts.filter((post) => post.id !== featured?.id).slice(0, 7);

  const categoryMap = options.posts.reduce<Map<string, BlogPostPreview[]>>((acc, post) => {
    const categories = post.categories.length > 0 ? post.categories : [{ title: "General", slug: "general" }];
    categories.forEach((category) => {
      const categoryName = category.title;
      const current = acc.get(categoryName) ?? [];
      if (current.length >= 4) {
        return;
      }
      acc.set(categoryName, [...current, post]);
    });
    return acc;
  }, new Map<string, BlogPostPreview[]>());

  const categories: BlogCategorySection[] = Array.from(categoryMap.entries())
    .map(([name, posts]) => ({ name, posts }))
    .sort((left, right) => {
      const leftHasFeatured = left.posts.some((post) => post.id === featured?.id);
      const rightHasFeatured = right.posts.some((post) => post.id === featured?.id);
      if (leftHasFeatured && !rightHasFeatured) {
        return -1;
      }
      if (!leftHasFeatured && rightHasFeatured) {
        return 1;
      }
      return right.posts.length - left.posts.length;
    });

  return {
    featured,
    recent,
    categories: categories.filter((section) => section.posts.length > 0).slice(0, 6),
  };
};

const toPreview = (record: BlogPostRecord): BlogPostPreview | null => {
  const slug = record.slug;
  if (!slug) {
    return null;
  }

  return {
    id: record._id,
    title: record.title ?? "Untitled post",
    slug,
    excerpt: record.excerpt || "",
    featured: record.featured,
    categories: (record.categories ?? [])
      .filter((category) => typeof category.title === "string" && category.title.length > 0)
      .map((category) => ({
        title: category.title as string,
        slug:
          typeof category.slug === "string" && category.slug.length > 0
            ? category.slug
            : (category.title as string).toLowerCase().replace(/\s+/g, "-"),
      })),
    publishedAt: record.publishedAt || null,
    image: {
      url: record.mainImage ? urlForImage(record.mainImage)?.url() || null : null,
      alt: getImageAlt(record.mainImage),
    },
  };
};

export const buildSanityImageUrl = (options: { assetRef?: string }): string | null => {
  const source: Image = {
    _type: "image",
    asset: options.assetRef ? { _type: "reference", _ref: options.assetRef } : undefined,
  };
  const builder = urlForImage(source);
  if (!builder) {
    return null;
  }
  return builder.url();
};

export const getBlogPosts = async (): Promise<BlogPostPreview[]> => {
  const hasConfig =
    typeof process.env.NEXT_PUBLIC_SANITY_PROJECT_ID === "string" &&
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID.length > 0 &&
    typeof process.env.NEXT_PUBLIC_SANITY_DATASET === "string" &&
    process.env.NEXT_PUBLIC_SANITY_DATASET.length > 0;
  if (!hasConfig) {
    return [];
  }

  const records = await sanityFetch({ query: blogPostsQuery });
  if (!Array.isArray(records)) {
    return [];
  }
  return records
    .map(toPreview)
    .filter((record): record is BlogPostPreview => record !== null);
};

export const getBlogPostBySlug = async (options: {
  slug: string;
}): Promise<BlogPost | null> => {
  const hasConfig =
    typeof process.env.NEXT_PUBLIC_SANITY_PROJECT_ID === "string" &&
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID.length > 0 &&
    typeof process.env.NEXT_PUBLIC_SANITY_DATASET === "string" &&
    process.env.NEXT_PUBLIC_SANITY_DATASET.length > 0;
  if (!hasConfig) {
    return null;
  }

  const record = await sanityFetch({
    query: blogPostBySlugQuery,
    params: { slug: options.slug },
  });
  if (!record) {
    return null;
  }

  const preview = toPreview(record);
  if (!preview) {
    return null;
  }

  return {
    ...preview,
    body: Array.isArray(record.content) ? record.content : [],
  };
};
