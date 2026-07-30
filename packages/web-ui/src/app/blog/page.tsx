import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildBlogSections, getBlogPosts } from "@/lib/sanity-blog";

import { BlogArchiveMedia } from "./blog-archive-media";
import { BlogCover } from "./blog-cover";
import { formatBlogPublishedAt } from "./blog-format";
import { BlogNewsroomChrome } from "./blog-newsroom-chrome";

export default async function BlogPage() {
  const posts = await getBlogPosts();
  const sections = buildBlogSections({ posts });
  const featured = sections.featured;
  const archive = sections.archive;
  const categories = sections.categories;

  if (!featured) {
    return (
      <BlogNewsroomChrome>
        <main className="flex flex-1 flex-col">
          <p className="mx-auto my-16 w-full max-w-xl px-5 text-center text-lg text-blog-muted">
            No blog posts are published yet.
          </p>
        </main>
      </BlogNewsroomChrome>
    );
  }

  return (
    <BlogNewsroomChrome>
      <main className="flex flex-1 flex-col">
        <section
          className="relative isolate grid min-h-[calc(100vh-4.75rem)] items-end overflow-hidden"
          aria-labelledby="featured-story-title"
        >
          <div className="absolute inset-0 z-0">
            <BlogCover
              src={featured.image.url}
              alt={featured.image.alt || featured.title}
              title={featured.title}
              priority
            />
          </div>
          <div
            className="absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(28,36,28,0.18)_0%,rgba(28,36,28,0.28)_42%,rgba(28,36,28,0.78)_100%)]"
            aria-hidden
          />
          <div className="relative z-[2] mx-auto w-full max-w-[var(--blog-max)] px-[clamp(1.1rem,3vw,2.4rem)] pt-[clamp(2.5rem,8vh,5rem)] pb-[clamp(2.2rem,5vh,3.5rem)] text-[#f8f4ec]">
            <p className="font-blog-display mb-3 text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight">
              Agent Play World
            </p>
            <h1
              id="featured-story-title"
              className="font-blog-display m-0 max-w-[16ch] text-[clamp(2.4rem,6vw,4.4rem)] leading-[1.02] font-semibold tracking-tight"
            >
              <Link
                href={`/blog/${featured.slug}`}
                className="text-inherit no-underline transition-colors hover:text-blog-honey-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blog-honey-soft"
              >
                {featured.title}
              </Link>
            </h1>
            <p className="mt-4 text-[0.95rem] text-[rgba(248,244,236,0.78)]">
              {formatBlogPublishedAt(featured.publishedAt)}
            </p>
            {featured.excerpt ? (
              <p className="mt-3.5 max-w-[42ch] text-[clamp(1.05rem,2vw,1.2rem)] leading-relaxed text-[rgba(248,244,236,0.9)]">
                {featured.excerpt}
              </p>
            ) : null}
            <Button asChild variant="hero" size="lg" className="mt-6 font-blog-display">
              <Link href={`/blog/${featured.slug}`}>Read the story</Link>
            </Button>
          </div>
        </section>

        {categories.length > 0 ? (
          <section
            className="mx-auto w-full max-w-[var(--blog-max)] px-[clamp(1.1rem,3vw,2.4rem)] pt-[clamp(2.5rem,6vh,4rem)]"
            aria-labelledby="categories-heading"
          >
            <h2
              id="categories-heading"
              className="font-blog-display mb-6 text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-blog-ink"
            >
              Browse by category
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {categories.map((category) => {
                const leadPost = category.posts[0];
                const storyLabel =
                  category.posts.length === 1
                    ? "1 story"
                    : `${category.posts.length} stories`;
                const blurb =
                  leadPost?.excerpt?.trim() ||
                  `Latest from ${category.name} in the Agent Play World newsroom.`;

                return (
                  <Card key={category.slug} className="flex flex-col">
                    <CardHeader>
                      <CardTitle>{category.name}</CardTitle>
                      <CardDescription>{storyLabel}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="line-clamp-3 text-sm leading-relaxed text-blog-ink-soft">
                        {blurb}
                      </p>
                    </CardContent>
                    <CardFooter className="justify-between">
                      {leadPost ? (
                        <>
                          <Link
                            href={`/blog/${leadPost.slug}`}
                            className="text-sm font-medium text-blog-teal no-underline hover:text-blog-ink"
                          >
                            Read more
                          </Link>
                          <Button asChild size="sm" variant="secondary">
                            <Link href={`/blog/${leadPost.slug}`}>Explore</Link>
                          </Button>
                        </>
                      ) : null}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </section>
        ) : null}

        {archive.length > 0 ? (
          <section
            className="mx-auto w-full max-w-[var(--blog-max)] px-[clamp(1.1rem,3vw,2.4rem)] pt-[clamp(2.5rem,6vh,4rem)] pb-20"
            aria-labelledby="archive-heading"
          >
            <h2
              id="archive-heading"
              className="font-blog-display mb-6 text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-blog-ink"
            >
              More from the newsroom
            </h2>
            <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
              {archive.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="flex gap-4 rounded-xl border border-[var(--blog-line)] bg-blog-paper p-4 text-inherit no-underline shadow-[var(--blog-shadow)] transition-colors hover:border-blog-sage-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blog-teal"
                  >
                    <BlogArchiveMedia
                      title={post.title}
                      imageUrl={post.image.url}
                      imageAlt={post.image.alt}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-blog-display m-0 text-[clamp(1.1rem,2vw,1.35rem)] leading-snug font-semibold text-blog-ink">
                        {post.title}
                      </h3>
                      <p className="mt-2 text-sm text-blog-muted">
                        {formatBlogPublishedAt(post.publishedAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </BlogNewsroomChrome>
  );
}
