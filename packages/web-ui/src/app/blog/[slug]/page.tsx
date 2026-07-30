import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/sanity-blog";

import { BlogCover } from "../blog-cover";
import { formatBlogPublishedAt } from "../blog-format";
import { BlogNewsroomChrome } from "../blog-newsroom-chrome";
import { BlogPortableText, toPortableTextBlocks } from "../blog-portable-text";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug({ slug });

  if (!post) {
    return { title: "Blog post not found" };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPostBySlug({ slug });

  if (!post) {
    notFound();
  }

  const blocks = toPortableTextBlocks(post.body);

  return (
    <BlogNewsroomChrome>
      <main className="flex flex-1 flex-col">
        <header
          className="relative isolate grid min-h-[clamp(22rem,62vh,36rem)] items-end overflow-hidden"
          aria-labelledby="post-title"
        >
          <div className="absolute inset-0 z-0">
            <BlogCover
              src={post.image.url}
              alt={post.image.alt || post.title}
              priority
            />
          </div>
          <div
            className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(28,36,28,0.12)_0%,rgba(28,36,28,0.35)_45%,rgba(28,36,28,0.78)_100%)]"
            aria-hidden
          />
          <div className="relative z-[2] mx-auto w-full max-w-[var(--blog-max)] px-[clamp(1.1rem,3vw,2.4rem)] pt-[clamp(2.2rem,7vh,4.5rem)] pb-[clamp(2rem,5vh,3.2rem)] text-[#f8f4ec]">
            <p className="font-blog-display mb-3 text-[clamp(1.35rem,2.6vw,1.8rem)] font-semibold tracking-tight">
              Agent Play World
            </p>
            <h1
              id="post-title"
              className="font-blog-display m-0 max-w-[18ch] text-[clamp(2.2rem,5.5vw,3.8rem)] leading-[1.04] font-semibold tracking-tight"
            >
              {post.title}
            </h1>
            <p className="mt-4 text-[0.95rem] text-[rgba(248,244,236,0.8)]">
              {formatBlogPublishedAt(post.publishedAt)}
            </p>
          </div>
        </header>

        <article className="mx-auto w-full max-w-[var(--blog-measure)] px-[clamp(1.1rem,3vw,1.5rem)] pt-[clamp(2rem,5vh,3.25rem)] pb-20">
          <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
            <Link href="/blog">Back to Newsroom</Link>
          </Button>
          {post.excerpt ? (
            <p className="mb-7 text-xl leading-relaxed text-blog-ink-soft italic">
              {post.excerpt}
            </p>
          ) : null}
          <BlogPortableText value={blocks} />
        </article>
      </main>
    </BlogNewsroomChrome>
  );
}
