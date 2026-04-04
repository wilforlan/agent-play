"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DOC_BROWSER_ROUTE } from "@/lib/docs/doc-public-path";
import { relativeMdToUrlSlugSegments } from "@/lib/docs/slug-url";
import styles from "./doc.module.css";

type DocNavProps = {
  paths: string[];
};

function hrefForRelativeMd(rel: string): string {
  const segments = relativeMdToUrlSlugSegments(rel);
  if (segments.length === 0) {
    return DOC_BROWSER_ROUTE;
  }
  return `${DOC_BROWSER_ROUTE}/${segments.map(encodeURIComponent).join("/")}`;
}

function labelForRelativeMd(rel: string): string {
  if (rel === "README.md") {
    return "Documentation home";
  }
  if (rel.endsWith("/README.md")) {
    return rel.slice(0, -"/README.md".length).split("/").pop() ?? rel;
  }
  return rel.replace(/\.md$/, "").split("/").pop() ?? rel;
}

export function DocNav({ paths }: DocNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation">
      <p className={styles.sidebarTitle}>Browse</p>
      <ul className={styles.navList}>
        {paths.map((rel) => {
          const href = hrefForRelativeMd(rel);
          const active = pathname === href;
          return (
            <li
              key={rel}
              className={styles.navItem}
              style={{ paddingLeft: `${(rel.split("/").length - 1) * 10}px` }}
            >
              <Link
                href={href}
                className={active ? styles.navLinkActive : styles.navLink}
              >
                {labelForRelativeMd(rel)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
