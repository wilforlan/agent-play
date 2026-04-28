import Link from "next/link";
import Image from "next/image";

import { buildBlogSections, getBlogPosts } from "@/lib/sanity-blog";
import styles from "./blog-page.module.css";

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
  const categoryNames = sections.categories.map((section) => section.name);

  return (
    <main className={styles.page}>
      {posts.length === 0 ? (
        <p className={styles.empty}>No blog posts are published yet.</p>
      ) : (
        <section className={styles.shell}>
          <nav className={styles.nav}>
            <div className={styles.navPrimary}>
              <Link href="/" aria-label="Agent Play home" className={styles.logoLink}>
                <Image src="/agent-play-logo.png" alt="Agent Play" fill style={{ objectFit: "contain" }} priority />
              </Link>
              <Link href="/" className={styles.navLink} aria-label="Back to home">
                &#8592;
              </Link>
            </div>
            <div className={styles.navActions}>
              <a href="/agent-play/watch" className={styles.navLink}>
                Watch Canvas
              </a>
              <a href="/doc" className={styles.navLink}>
                Documentation
              </a>
              <a href="https://github.com/wilforlan/agent-play" target="_blank" rel="noreferrer" className={styles.navLink}>
                Github
              </a>
            </div>
          </nav>

          {featured ? (
            <section className={styles.heroGrid}>
              <article className={styles.featuredCard}>
                <p className={styles.label}>Featured Story</p>
                <h1 className={styles.featuredHeadline}>
                  <Link href={`/blog/${featured.slug}`}>{featured.title}</Link>
                </h1>
                <p className={styles.meta}>{formatPublishedAt(featured.publishedAt)}</p>
                {featured.excerpt ? <p className={styles.excerpt}>{featured.excerpt}</p> : null}
              </article>
              <aside className={styles.latestRail}>
                <h2 className={styles.railHeading}>Latest</h2>
                {recent.length === 0 ? (
                  <p className={styles.empty}>No additional posts yet.</p>
                ) : (
                  recent.slice(0, 3).map((post) => (
                    <article key={post.id} className={styles.railItem}>
                      <h3 className={styles.postTitle}>
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </h3>
                      <p className={styles.meta}>{formatPublishedAt(post.publishedAt)}</p>
                    </article>
                  ))
                )}
              </aside>
            </section>
          ) : null}

          <section className={styles.categoryStrip} aria-label="Category discovery">
            {categoryNames.map((name) => (
              <a key={name} href={`#category-${name.toLowerCase().replace(/\s+/g, "-")}`} className={styles.categoryChip}>
                {name}
              </a>
            ))}
          </section>

          <section className={styles.categoriesSection}>
            <h2 className={styles.categoriesHeading}>Browse by Category</h2>
            <div className={styles.categoriesGrid}>
              {sections.categories.map((section) => (
                <section
                  id={`category-${section.name.toLowerCase().replace(/\s+/g, "-")}`}
                  key={section.name}
                  className={styles.categoryCard}
                >
                  <h3 className={styles.categoryTitle}>{section.name}</h3>
                  <div className={styles.categoryList}>
                    {section.posts.map((post) => (
                      <article key={post.id} className={styles.categoryItem}>
                        <h4 className={styles.postTitle}>
                          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                        </h4>
                        <p className={styles.meta}>{formatPublishedAt(post.publishedAt)}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </section>
      )}
    </main>
  );
}
