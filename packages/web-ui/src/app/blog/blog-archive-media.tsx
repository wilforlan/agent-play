"use client";

import Image from "next/image";
import React, { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { getTitleInitials } from "./blog-format";

type BlogArchiveMediaProps = {
  title: string;
  imageUrl: string | null;
  imageAlt: string;
  variant?: "archive" | "compact";
};

const IMAGE_FRAME_CLASS: Record<
  NonNullable<BlogArchiveMediaProps["variant"]>,
  string
> = {
  archive:
    "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-blog-cream-deep sm:h-20 sm:w-28",
  compact:
    "relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-blog-cream-deep",
};

const AVATAR_CLASS: Record<
  NonNullable<BlogArchiveMediaProps["variant"]>,
  string
> = {
  archive: "h-16 w-16 rounded-lg sm:h-20 sm:w-20",
  compact: "h-14 w-14 shrink-0 rounded-md",
};

const FALLBACK_CLASS: Record<
  NonNullable<BlogArchiveMediaProps["variant"]>,
  string
> = {
  archive: "rounded-lg bg-blog-sage-soft text-base text-blog-ink sm:text-lg",
  compact: "rounded-md bg-blog-sage-soft text-sm text-blog-ink",
};

const IMAGE_SIZES: Record<
  NonNullable<BlogArchiveMediaProps["variant"]>,
  string
> = {
  archive: "112px",
  compact: "80px",
};

export const BlogArchiveMedia = ({
  title,
  imageUrl,
  imageAlt,
  variant = "archive",
}: BlogArchiveMediaProps) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = getTitleInitials(title);
  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;

  if (showImage && imageUrl) {
    return (
      <div className={IMAGE_FRAME_CLASS[variant]}>
        <Image
          src={imageUrl}
          alt={imageAlt || title}
          fill
          sizes={IMAGE_SIZES[variant]}
          className="object-cover object-center"
          onError={() => {
            setFailedUrl(imageUrl);
          }}
        />
      </div>
    );
  }

  return (
    <Avatar className={AVATAR_CLASS[variant]}>
      <AvatarFallback className={FALLBACK_CLASS[variant]}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};
