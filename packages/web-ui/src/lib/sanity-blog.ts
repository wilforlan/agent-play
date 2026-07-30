import type { PortableTextBlock } from "@portabletext/types";
import type { Image } from "sanity";

import { blogPostBySlugQuery, blogPostsQuery } from "@/sanity/lib/queries";
import { sanityFetch } from "@/sanity/lib/fetch";
import { urlForImage } from "@/sanity/lib/utils";

type BlogImage = Image & { alt?: string };

type BlogAuthorRecord = {
  name?: string | null;
  picture?: BlogImage | null;
} | null;

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
  author?: BlogAuthorRecord;
};

const getImageAlt = (image: BlogImage | null): string => {
  if (!image) {
    return "";
  }
  return image.alt || "";
};

export type BlogPostAuthor = {
  name: string;
  pictureUrl: string | null;
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
  author: BlogPostAuthor | null;
};

export type BlogPost = BlogPostPreview & {
  body: PortableTextBlock[];
};

export type BlogCategorySection = {
  name: string;
  slug: string;
  posts: BlogPostPreview[];
};

export type BlogSections = {
  featured: BlogPostPreview | null;
  archive: BlogPostPreview[];
  categories: BlogCategorySection[];
};

const CATEGORY_PREVIEW_LIMIT = 3;
const CATEGORY_POST_PREVIEW_LIMIT = 4;

type CategoryBucket = {
  name: string;
  slug: string;
  posts: BlogPostPreview[];
};

export const buildBlogSections = (options: { posts: BlogPostPreview[] }): BlogSections => {
  const featured = options.posts.find((post) => post.featured) ?? options.posts[0] ?? null;
  const archive = options.posts.filter((post) => post.id !== featured?.id);

  const categoryMap = options.posts.reduce<Map<string, CategoryBucket>>((acc, post) => {
    const categories =
      post.categories.length > 0
        ? post.categories
        : [{ title: "General", slug: "general" }];

    categories.forEach((category) => {
      const existing = acc.get(category.slug);
      if (!existing) {
        acc.set(category.slug, {
          name: category.title,
          slug: category.slug,
          posts: [post],
        });
        return;
      }

      if (existing.posts.length >= CATEGORY_POST_PREVIEW_LIMIT) {
        return;
      }

      acc.set(category.slug, {
        ...existing,
        posts: [...existing.posts, post],
      });
    });

    return acc;
  }, new Map());

  const categories = Array.from(categoryMap.values())
    .filter((section) => section.posts.length > 0)
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
    })
    .slice(0, CATEGORY_PREVIEW_LIMIT);

  return {
    featured,
    archive,
    categories,
  };
};

const toAuthor = (author: BlogAuthorRecord): BlogPostAuthor | null => {
  if (!author || typeof author.name !== "string") {
    return null;
  }

  const name = author.name.trim();
  if (name.length === 0) {
    return null;
  }

  return {
    name,
    pictureUrl: author.picture
      ? urlForImage(author.picture)?.url() || null
      : null,
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
    categories: (record.categories ?? []).flatMap((category) => {
      if (typeof category.title !== "string" || category.title.length === 0) {
        return [];
      }

      const title = category.title;
      const slug =
        typeof category.slug === "string" && category.slug.length > 0
          ? category.slug
          : title.toLowerCase().replace(/\s+/g, "-");

      return [{ title, slug }];
    }),
    publishedAt: record.publishedAt || null,
    image: {
      url: record.mainImage ? urlForImage(record.mainImage)?.url() || null : null,
      alt: getImageAlt(record.mainImage),
    },
    author: toAuthor(record.author ?? null),
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
