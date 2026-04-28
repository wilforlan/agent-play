import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getBlogPostBySlug, getBlogPosts } from "@/lib/sanity-blog";

type PortableTextSpan = {
  _type?: string;
  text?: string;
};

type PortableTextBlock = {
  _type?: string;
  style?: string;
  children?: PortableTextSpan[];
};

const asPortableText = (body: unknown): PortableTextBlock[] => {
  if (!Array.isArray(body)) {
    return [];
  }

  return body
    .filter((item): item is PortableTextBlock => typeof item === "object" && item !== null)
    .filter((item) => item._type === "block");
};

const renderBlock = (block: PortableTextBlock, index: number) => {
  const text = (block.children ?? [])
    .filter((child) => child._type === "span")
    .map((child) => child.text ?? "")
    .join("");

  if (block.style === "h2") {
    return <h2 key={index}>{text}</h2>;
  }
  if (block.style === "h3") {
    return <h3 key={index}>{text}</h3>;
  }
  return <p key={index}>{text}</p>;
};

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

  const blocks = asPortableText(post.body);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
      <article>
        <h1>{post.title}</h1>
        {post.publishedAt ? (
          <p style={{ color: "#666" }}>
            {new Date(post.publishedAt).toLocaleDateString("en-GB", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        ) : null}
        {post.excerpt ? <p>{post.excerpt}</p> : null}
        {blocks.length === 0 ? <p>Content coming soon.</p> : blocks.map(renderBlock)}
      </article>
    </main>
  );
}
