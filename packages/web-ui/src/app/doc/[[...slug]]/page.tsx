import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { notFound } from "next/navigation";

import { DOC_BROWSER_ROUTE } from "@/lib/docs/doc-public-path";
import { getDocsRoot } from "@/lib/docs/paths";
import { relativeMdToUrlSlugSegments } from "@/lib/docs/slug-url";
import { listMarkdownRelativePaths } from "@/lib/docs/list-markdown";
import { renderDocMarkdown } from "@/lib/docs/render-doc-markdown";
import { resolveSlugToRelativeMdPath } from "@/lib/docs/resolve-doc-path";

import styles from "../doc.module.css";

export const dynamic = "force-static";

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const segments = slug ?? [];
  const relativeMd = resolveSlugToRelativeMdPath(segments);
  if (!relativeMd) {
    notFound();
  }

  const root = getDocsRoot();
  let raw: string;
  try {
    raw = await readFile(join(root, relativeMd), "utf-8");
  } catch {
    notFound();
  }

  const html = await renderDocMarkdown(raw, {
    currentRelativePath: relativeMd,
    docBasePath: DOC_BROWSER_ROUTE,
  });

  const title = relativeMd.replace(/\.md$/, "").split("/").pop() ?? "Docs";

  return (
    <article>
      <h1 className={styles.title}>
        {relativeMd === "README.md" ? "Documentation" : title}
      </h1>
      <div
        className={`${styles.prose}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}

export async function generateStaticParams(): Promise<{ slug?: string[] }[]> {
  const files = await listMarkdownRelativePaths();
  if (files.length === 0) {
    return [{ slug: undefined }];
  }
  return files.map((rel) => {
    const slug = relativeMdToUrlSlugSegments(rel);
    return { slug: slug.length ? slug : undefined };
  });
}
