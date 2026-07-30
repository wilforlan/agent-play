import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { BlogPostPreview } from "@/lib/sanity-blog";

import { BlogArchiveMedia } from "./blog-archive-media";
import { formatBlogPublishedAt, getTitleInitials } from "./blog-format";
import {
  BLOG_POST_CTAS,
  type BlogAuthorDisplay,
} from "./blog-post-helpers";

type BlogPostAuthorAsideProps = {
  author: BlogAuthorDisplay;
};

export const BlogPostAuthorAside = ({ author }: BlogPostAuthorAsideProps) => {
  const initials = getTitleInitials(author.name);

  return (
    <aside className="flex flex-col gap-6" aria-label="Author and product links">
      <div className="flex flex-col gap-3">
        <Avatar className="h-14 w-14">
          {author.pictureUrl ? (
            <AvatarImage src={author.pictureUrl} alt={author.name} />
          ) : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-blog-muted uppercase">
            Written by
          </p>
          <p className="font-blog-display mt-1 text-lg font-semibold text-blog-ink">
            {author.name}
          </p>
        </div>
      </div>
      <nav className="flex flex-col gap-2" aria-label="Product links">
        {BLOG_POST_CTAS.map((cta) =>
          cta.external ? (
            <Button
              key={cta.href}
              asChild
              variant="outline"
              size="sm"
              className="justify-start"
            >
              <a href={cta.href} target="_blank" rel="noreferrer">
                {cta.label}
              </a>
            </Button>
          ) : (
            <Button
              key={cta.href}
              asChild
              variant="outline"
              size="sm"
              className="justify-start"
            >
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          ),
        )}
      </nav>
    </aside>
  );
};

type BlogPostRecentAsideProps = {
  posts: ReadonlyArray<BlogPostPreview>;
};

export const BlogPostRecentAside = ({ posts }: BlogPostRecentAsideProps) => {
  if (posts.length === 0) {
    return null;
  }

  return (
    <aside
      className="flex flex-col gap-4"
      aria-labelledby="recent-posts-heading"
    >
      <h2
        id="recent-posts-heading"
        className="font-blog-display text-lg font-semibold tracking-tight text-blog-ink"
      >
        Recent posts
      </h2>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {posts.map((post) => (
          <li key={post.id}>
            <Link
              href={`/blog/${post.slug}`}
              className="group flex gap-3 text-inherit no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blog-teal"
            >
              <BlogArchiveMedia
                title={post.title}
                imageUrl={post.image.url}
                imageAlt={post.image.alt || post.title}
                variant="compact"
              />
              <div className="min-w-0 flex-1">
                <p className="font-blog-display text-sm leading-snug font-semibold text-blog-ink transition-colors group-hover:text-blog-teal">
                  {post.title}
                </p>
                <p className="mt-1 text-xs text-blog-muted">
                  {formatBlogPublishedAt(post.publishedAt)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
};
