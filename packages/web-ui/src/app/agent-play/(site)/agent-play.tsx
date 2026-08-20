"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { type ReactNode } from "react";

import {
  AGENT_PLAY_BRAND,
  AGENT_PLAY_FOOTER_COLUMNS,
  AGENT_PLAY_NAV_SECTIONS,
  type AgentPlayNavItem,
} from "./agent-play-content";
import styles from "./agent-play.module.css";

type AgentPlayProps = {
  children: ReactNode;
};

const ACCOUNT_HREFS = new Set(["/agent-play/login", "/agent-play/register"]);
const REGISTER_HREF = "/agent-play/register";

const isActiveHref = (pathname: string, href: string): boolean => {
  return pathname === href || pathname.startsWith(`${href}/`);
};

const isExternalHref = (href: string): boolean => {
  return href.startsWith("http://") || href.startsWith("https://");
};

const navLinkClassName = (
  pathname: string,
  item: AgentPlayNavItem,
  extraClassName?: string,
): string => {
  const classes = [styles.headerLink];
  if (extraClassName !== undefined) {
    classes.push(extraClassName);
  }
  if (isActiveHref(pathname, item.href)) {
    classes.push(styles.headerLinkActive);
  }
  if (item.href === REGISTER_HREF) {
    classes.push(styles.headerCta);
  }
  return classes.join(" ");
};

const NavDestination = ({
  item,
  pathname,
  extraClassName,
}: {
  item: AgentPlayNavItem;
  pathname: string;
  extraClassName?: string;
}) => {
  const className = navLinkClassName(pathname, item, extraClassName);

  if (isExternalHref(item.href)) {
    return (
      <a
        href={item.href}
        className={className}
        target="_blank"
        rel="noreferrer"
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  );
};

export function AgentPlay({ children }: AgentPlayProps) {
  const pathname = usePathname();
  const [marketplaceSection, worldsSection] = AGENT_PLAY_NAV_SECTIONS;
  const marketplaceItems = marketplaceSection.items.filter(
    (item) => !ACCOUNT_HREFS.has(item.href),
  );
  const accountItems = marketplaceSection.items.filter((item) =>
    ACCOUNT_HREFS.has(item.href),
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/agent-play" className={styles.brandBlock}>
            <span className={styles.brandMark} aria-hidden>
              AP
            </span>
            <p className={styles.brandName}>{AGENT_PLAY_BRAND.name}</p>
          </Link>
          <div className={styles.headerNav}>
            <nav className={styles.nav} aria-label="Agent Play">
              <div className={styles.navGroup}>
                {marketplaceItems.map((item) => (
                  <NavDestination
                    key={item.href}
                    item={item}
                    pathname={pathname}
                  />
                ))}
              </div>
              <div className={styles.navActions}>
                {accountItems.map((item) => (
                  <NavDestination
                    key={item.href}
                    item={item}
                    pathname={pathname}
                  />
                ))}
              </div>
            </nav>
            <nav className={styles.worldNav} aria-label={worldsSection.label}>
              <p className={styles.worldNavLabel}>{worldsSection.label}</p>
              <div className={styles.worldNavGroup}>
                {worldsSection.items.map((item) => (
                  <NavDestination
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    extraClassName={styles.worldNavLink}
                  />
                ))}
              </div>
            </nav>
          </div>
        </div>
      </header>
      {children}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.footerBrandRow}>
              <span className={styles.brandMark} aria-hidden>
                AP
              </span>
              <p className={styles.brandName}>{AGENT_PLAY_BRAND.name}</p>
            </div>
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
