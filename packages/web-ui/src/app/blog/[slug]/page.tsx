import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/sanity-blog";

import { formatBlogPublishedAt } from "../blog-format";
import { BlogNewsroomChrome } from "../blog-newsroom-chrome";
import { BlogPortableText, toPortableTextBlocks } from "../blog-portable-text";
import { BlogPostAuthorAside, BlogPostRecentAside } from "../blog-post-asides";
import {
  pickRecentBlogPosts,
  resolveBlogAuthorDisplay,
} from "../blog-post-helpers";
import {
  buildBlogPostMetadata,
  resolveSiteOrigin,
} from "../blog-post-metadata";
import { BlogPostHero } from "../blog-post-hero";

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

  return buildBlogPostMetadata({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    body: post.body,
    imageUrl: post.image.url,
    imageAlt: post.image.alt || post.title,
    siteOrigin: resolveSiteOrigin({
      envValue: process.env.NEXT_PUBLIC_SITE_ORIGIN,
    }),
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, posts] = await Promise.all([
    getBlogPostBySlug({ slug }),
    getBlogPosts(),
  ]);

  if (!post) {
    notFound();
  }

  const blocks = toPortableTextBlocks(post.body);
  const author = resolveBlogAuthorDisplay(post.author);
  const recentPosts = pickRecentBlogPosts({
    posts,
    currentSlug: post.slug,
  });

  return (
    <BlogNewsroomChrome>
      <main className="flex flex-1 flex-col">
        <BlogPostHero
          title={post.title}
          imageUrl={post.image.url}
          imageAlt={post.image.alt || post.title}
          publishedLabel={formatBlogPublishedAt(post.publishedAt)}
        />

        <div className="mx-auto grid w-full max-w-[var(--blog-post-max)] grid-cols-1 gap-10 px-[clamp(1.1rem,3vw,2.4rem)] pt-[clamp(2rem,5vh,3rem)] pb-20 lg:grid-cols-[13rem_minmax(0,1fr)_14rem] lg:gap-12 xl:grid-cols-[14rem_minmax(0,1fr)_15rem]">
          <div className="lg:sticky lg:top-[calc(var(--blog-nav-offset)+1rem)] lg:self-start">
            <BlogPostAuthorAside author={author} />
          </div>

          <article className="min-w-0 max-w-[var(--blog-post-measure)]">
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

          <div className="lg:sticky lg:top-[calc(var(--blog-nav-offset)+1rem)] lg:self-start">
            <BlogPostRecentAside posts={recentPosts} />
          </div>
        </div>
      </main>
    </BlogNewsroomChrome>
  );
}
