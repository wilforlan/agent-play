"use client";

import Image from "next/image";
import React, { useState } from "react";

type BlogCoverProps = {
  src: string | null;
  alt: string;
  priority?: boolean;
};

export const BlogCover = ({ src, alt, priority = false }: BlogCoverProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showFallback = !src || failedSrc === src;

  if (showFallback) {
    return (
      <div
        data-testid="blog-cover-fallback"
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(61,107,107,0.28),transparent_58%),linear-gradient(320deg,rgba(122,143,122,0.16),transparent_50%),linear-gradient(180deg,#141a16_0%,#1c241c_52%,#0f1412_100%)]"
      />
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
