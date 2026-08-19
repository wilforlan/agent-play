"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { type ReactNode } from "react";

import {
  AGENT_PLAY_BRAND,
  AGENT_PLAY_FOOTER_COLUMNS,
  AGENT_PLAY_NAV,
} from "./agent-play-content";
import styles from "./agent-play.module.css";

type AgentPlayProps = {
  children: ReactNode;
};

const isActiveHref = (pathname: string, href: string): boolean => {
  return pathname === href || pathname.startsWith(`${href}/`);
};

export function AgentPlay({ children }: AgentPlayProps) {
  const pathname = usePathname();

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/agent-play" className={styles.brandBlock}>
            <p className={styles.brandName}>{AGENT_PLAY_BRAND.name}</p>
          </Link>
          <nav className={styles.nav} aria-label="Agent Play">
            {AGENT_PLAY_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActiveHref(pathname, item.href)
                    ? `${styles.navLink} ${styles.navLinkActive}`
                    : styles.navLink
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
      </div>
      {children}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <p className={styles.brandName}>{AGENT_PLAY_BRAND.name}</p>
            <p className={styles.muted}>{AGENT_PLAY_BRAND.tagline}</p>
          </div>
          <div className={styles.footerColumns}>
            {AGENT_PLAY_FOOTER_COLUMNS.map((column) => (
              <section key={column.title}>
                <h2 className={styles.footerColumnTitle}>{column.title}</h2>
                <ul className={styles.footerList}>
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.href}`}>
                      <Link href={link.href} className={styles.navLink}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className={styles.legal}>{AGENT_PLAY_BRAND.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
