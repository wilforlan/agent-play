import type { Metadata } from "next";

const DEFAULT_SUMMARY_MAX_LENGTH = 160;
const DEFAULT_SITE_NAME = "Agent Play";
const ELLIPSIS = "…";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const readSpanText = (child: unknown): string => {
  if (!isRecord(child)) {
    return "";
  }

  const text = child["text"];
  if (typeof text !== "string") {
    return "";
  }

  return text;
};

const isMeaningfulParagraphStyle = (style: unknown): boolean => {
  if (style === undefined || style === null || style === "normal") {
    return true;
  }

  return style === "blockquote";
};

const extractParagraphText = (block: unknown): string | null => {
  if (!isRecord(block)) {
    return null;
  }

  if (block["_type"] !== "block") {
    return null;
  }

  if (!isMeaningfulParagraphStyle(block["style"])) {
    return null;
  }

  const children = block["children"];
  if (!Array.isArray(children)) {
    return null;
  }

  const text = children.map(readSpanText).join("").replace(/\s+/g, " ").trim();
  if (text.length === 0) {
    return null;
  }

  return text;
};

const truncateAtWordBoundary = (options: {
  text: string;
  maxLength: number;
}): string => {
  const { text, maxLength } = options;
  if (text.length <= maxLength) {
    return text;
  }

  const hardLimit = Math.max(1, maxLength - ELLIPSIS.length);
  const slice = text.slice(0, hardLimit);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed =
    lastSpace > Math.floor(hardLimit * 0.6) ? slice.slice(0, lastSpace) : slice;

  return `${trimmed.trimEnd()}${ELLIPSIS}`;
};

export const portableTextToPlainSummary = (options: {
  body: unknown;
  maxLength?: number;
}): string => {
  const maxLength = options.maxLength ?? DEFAULT_SUMMARY_MAX_LENGTH;
  if (!Array.isArray(options.body)) {
    return "";
  }

  const paragraphs = options.body
    .map(extractParagraphText)
    .filter((paragraph): paragraph is string => paragraph !== null);

  if (paragraphs.length === 0) {
    return "";
  }

  const joined = paragraphs.join(" ");
  return truncateAtWordBoundary({ text: joined, maxLength });
};

export const resolveBlogPostDescription = (options: {
  excerpt?: string | null;
  body: unknown;
  maxLength?: number;
}): string => {
  const excerpt =
    typeof options.excerpt === "string" ? options.excerpt.trim() : "";
  if (excerpt.length > 0) {
    return excerpt;
  }

  return portableTextToPlainSummary({
    body: options.body,
    maxLength: options.maxLength,
  });
};

export const resolveBlogPostOgImageUrl = (options: {
  coverImageUrl: string | null | undefined;
  siteOrigin: string;
  fallbackImagePath?: string;
}): string | undefined => {
  const cover =
    typeof options.coverImageUrl === "string"
      ? options.coverImageUrl.trim()
      : "";

  if (cover.length > 0) {
    if (/^https?:\/\//i.test(cover)) {
      return cover;
    }

    return new URL(cover, options.siteOrigin).toString();
  }

  const fallback = options.fallbackImagePath?.trim();
  if (!fallback || fallback.length === 0) {
    return undefined;
  }

  return new URL(fallback, options.siteOrigin).toString();
};

export type BuildBlogPostMetadataOptions = {
  title: string;
  slug: string;
  excerpt: string;
  body: unknown;
  imageUrl: string | null;
  imageAlt?: string;
  siteOrigin: string;
  siteName?: string;
  fallbackImagePath?: string;
};

export const buildBlogPostMetadata = (
  options: BuildBlogPostMetadataOptions,
): Metadata => {
  const description = resolveBlogPostDescription({
    excerpt: options.excerpt,
    body: options.body,
  });
  const canonicalUrl = new URL(
    `/blog/${options.slug}`,
    options.siteOrigin,
  ).toString();
  const imageUrl = resolveBlogPostOgImageUrl({
    coverImageUrl: options.imageUrl,
    siteOrigin: options.siteOrigin,
    fallbackImagePath: options.fallbackImagePath,
  });
  const siteName = options.siteName ?? DEFAULT_SITE_NAME;
  const imageAlt =
    typeof options.imageAlt === "string" && options.imageAlt.trim().length > 0
      ? options.imageAlt.trim()
      : options.title;

  return {
    title: options.title,
    description: description.length > 0 ? description : undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: options.title,
      description: description.length > 0 ? description : undefined,
      url: canonicalUrl,
      type: "article",
      siteName,
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                alt: imageAlt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: options.title,
      description: description.length > 0 ? description : undefined,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
};

export const resolveSiteOrigin = (options?: {
  envValue?: string | undefined;
  fallback?: string;
}): string => {
  const envValue = options?.envValue;
  if (typeof envValue === "string" && envValue.trim().length > 0) {
    return envValue.trim().replace(/\/$/, "");
  }

  return options?.fallback ?? "https://agent-play.com";
};
