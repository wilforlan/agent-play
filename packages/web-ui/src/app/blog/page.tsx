import Link from "next/link";
import Image from "next/image";

import { buildBlogSections, getBlogPosts } from "@/lib/sanity-blog";

const formatPublishedAt = (publishedAt: string | null): string => {
  if (!publishedAt) {
    return "Draft";
  }

  return new Date(publishedAt).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default async function BlogPage() {
  const posts = await getBlogPosts();
  const sections = buildBlogSections({ posts });
  const featured = sections.featured;
  const recent = sections.recent;

  return (
    <main style={{ maxWidth: 1220, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
      {posts.length === 0 ? (
        <p>No blog posts are published yet.</p>
      ) : (
        <>
          <section>
            <nav
              style={{
                padding: "0.75rem 1rem",
                borderRadius: 8,
                display: "flex",
                gap: "1rem",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <Link
                href="/"
                aria-label="Agent Play home"
                style={{
                  marginRight: "0.75rem",
                  display: "inline-flex",
                  width: 140,
                  height: 32,
                  position: "relative",
                }}
              >
                <Image src="/agent-play-logo.png" alt="Agent Play" fill style={{ objectFit: "contain" }} priority />
              </Link>
              <Link href="/" style={{ textDecoration: "none" }} aria-label="Back to home">
                &#8592;
              </Link>
              <a href="/agent-play/watch" style={{ textDecoration: "none" }}>
                Watch Canvas
              </a>
              <a href="/doc" style={{ textDecoration: "none" }}>
                Documentation
              </a>
              <a
                href="https://github.com/wilforlan/agent-play"
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none" }}
              >
                Github
              </a>
            </nav>

            <div>
              {featured ? (
                <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                  <article style={{ border: "1px solid #e5e5e5", padding: "1.25rem", borderRadius: 8 }}>
                    <p style={{ margin: 0, color: "#666", fontSize: 13 }}>Featured</p>
                    <h2 style={{ marginTop: "0.5rem", marginBottom: "0.25rem" }}>
                      <Link href={`/blog/${featured.slug}`}>{featured.title}</Link>
                    </h2>
                    <p style={{ marginTop: 0, color: "#666" }}>{formatPublishedAt(featured.publishedAt)}</p>
                    {featured.excerpt ? <p style={{ marginBottom: 0 }}>{featured.excerpt}</p> : null}
                  </article>
                  <aside style={{ border: "1px solid #e5e5e5", padding: "1rem", borderRadius: 8 }}>
                    <h3 style={{ marginTop: 0 }}>Recent</h3>
                    {recent.length === 0 ? (
                      <p style={{ marginBottom: 0, color: "#666" }}>No additional posts yet.</p>
                    ) : (
                      recent.slice(0, 4).map((post) => (
                        <article key={post.id} style={{ marginTop: "0.85rem" }}>
                          <h4 style={{ margin: 0, fontSize: 16 }}>
                            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                          </h4>
                          <p style={{ margin: "0.3rem 0 0", color: "#666", fontSize: 13 }}>
                            {formatPublishedAt(post.publishedAt)}
                          </p>
                        </article>
                      ))
                    )}
                  </aside>
                </section>
              ) : null}

              <section style={{ marginTop: "2rem" }}>
                <h2 style={{ marginBottom: "1rem" }}>Categories</h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {sections.categories.map((section) => (
                    <section
                      key={section.name}
                      style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: "1rem" }}
                    >
                      <h3 style={{ marginTop: 0 }}>{section.name}</h3>
                      {section.posts.map((post) => (
                        <article key={post.id} style={{ marginTop: "0.75rem" }}>
                          <h4 style={{ margin: 0, fontSize: 16 }}>
                            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                          </h4>
                          <p style={{ margin: "0.3rem 0 0", color: "#666", fontSize: 13 }}>
                            {formatPublishedAt(post.publishedAt)}
                          </p>
                        </article>
                      ))}
                    </section>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
