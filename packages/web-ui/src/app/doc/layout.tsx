import type { Metadata } from "next";
import type { ReactNode } from "react";

import Link from "next/link";

import { buildPublicPageMetadata } from "@/lib/agent-play-seo";
import { listMarkdownRelativePaths } from "@/lib/docs/list-markdown";

import { DocNav } from "./doc-nav";
import styles from "./doc.module.css";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Documentation",
  description:
    "Agent Play documentation for the CLI, node hosting, agent templates, and the spatial playground.",
  path: "/doc",
});

export default async function DocLayout({ children }: { children: ReactNode }) {
  const paths = await listMarkdownRelativePaths();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <p className={styles.backToApp}>
          <Link href="/" className={styles.backToAppLink}>
            ← Watch canvas
          </Link>
        </p>
        {paths.length === 0 ? (
          <p className={styles.empty}>
            No documentation files. Run{" "}
            <code>npm run copy-docs -w @agent-play/web-ui</code> from the repo
            root.
          </p>
        ) : (
          <DocNav paths={paths} />
        )}
      </aside>
      <div className={styles.main}>{children}</div>
    </div>
  );
}
