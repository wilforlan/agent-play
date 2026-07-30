"use client";

import Image from "next/image";
import React, { useState } from "react";

import { getTitleInitials } from "./blog-format";

type BlogCoverProps = {
  src: string | null;
  alt: string;
  title: string;
  priority?: boolean;
};

export const BlogCover = ({
  src,
  alt,
  title,
  priority = false,
}: BlogCoverProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showFallback = !src || failedSrc === src;
  const initials = getTitleInitials(title);

  if (showFallback) {
    return (
      <div
        data-testid="blog-cover-fallback"
        aria-hidden
        className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,rgba(61,107,107,0.28),transparent_58%),linear-gradient(320deg,rgba(122,143,122,0.16),transparent_50%),linear-gradient(180deg,#141a16_0%,#1c241c_52%,#0f1412_100%)]"
      >
        <span className="font-blog-display text-[clamp(4rem,18vw,9rem)] leading-none font-semibold tracking-tight text-[rgba(248,244,236,0.22)]">
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <Image
        src={src}
        alt={alt || "Story cover"}
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover object-center"
        onError={() => {
          setFailedSrc(src);
        }}
      />
    </div>
  );
};
