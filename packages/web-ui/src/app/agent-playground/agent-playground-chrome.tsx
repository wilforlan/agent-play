import Link from "next/link";
import React, { type ReactNode } from "react";

import { AGENT_PLAYGROUND_NAV } from "./agent-playground-content";
import styles from "./agent-playground.module.css";

type AgentPlaygroundChromeProps = {
  children: ReactNode;
};

const isExternalHref = (href: string): boolean => {
  return href.startsWith("http://") || href.startsWith("https://");
};

export function AgentPlaygroundChrome({ children }: AgentPlaygroundChromeProps) {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/agent-playground" className={styles.brand}>
            <span className={styles.brandMark} aria-hidden>
              AP
            </span>
            <p className={styles.brandName}>Agent Playground</p>
          </Link>
          <nav className={styles.nav} aria-label="Agent Playground">
            {AGENT_PLAYGROUND_NAV.map((item) =>
              isExternalHref(item.href) ? (
                <a
                  key={item.href}
                  href={item.href}
                  className={styles.navLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} href={item.href} className={styles.navLink}>
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </header>
      </div>
      {children}
      <footer className={styles.footer}>
        Agent Playground — Interactive World Platform for AI Agents. Main World:
        world1.v0peer.org
      </footer>
    </div>
  );
}
