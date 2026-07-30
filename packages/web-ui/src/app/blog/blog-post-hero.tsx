"use client";

import { useEffect, useState } from "react";

import { BlogCover } from "./blog-cover";

type BlogPostHeroProps = {
  title: string;
  imageUrl: string | null;
  imageAlt: string;
  publishedLabel: string;
};

export const BlogPostHero = ({
  title,
  imageUrl,
  imageAlt,
  publishedLabel,
}: BlogPostHeroProps) => {
  const [parallaxOffset, setParallaxOffset] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setParallaxOffset(window.scrollY * 0.35);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className="relative isolate flex min-h-[clamp(22rem,58vh,34rem)] flex-col justify-end overflow-hidden"
      aria-labelledby="post-title"
    >
      <div
        className="absolute inset-x-0 -top-[18%] bottom-[-18%] z-0 will-change-transform"
        style={{ transform: `translate3d(0, ${String(parallaxOffset)}px, 0)` }}
        aria-hidden
      >
        <BlogCover src={imageUrl} alt={imageAlt} title={title} priority />
      </div>
      <div
        className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(28,36,28,0.1)_0%,rgba(28,36,28,0.32)_48%,rgba(28,36,28,0.82)_100%)]"
        aria-hidden
      />
      <div className="sticky top-[var(--blog-nav-offset)] z-[2] w-full border-b border-[rgba(248,244,236,0.12)] bg-[linear-gradient(180deg,rgba(28,36,28,0.55)_0%,rgba(28,36,28,0.72)_100%)] backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[var(--blog-post-max)] px-[clamp(1.1rem,3vw,2.4rem)] py-[clamp(1rem,2.5vh,1.6rem)] text-[#f8f4ec]">
          <h1
            id="post-title"
            className="font-blog-display m-0 max-w-[22ch] text-[clamp(1.85rem,4.2vw,3.1rem)] leading-[1.08] font-semibold tracking-tight"
          >
            {title}
          </h1>
          <p className="mt-2 text-[0.85rem] tracking-wide text-[rgba(248,244,236,0.72)]">
            {publishedLabel}
          </p>
        </div>
      </div>
    </header>
  );
};
