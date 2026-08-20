import Link from "next/link";
import React, { type ReactNode } from "react";

import { AGENT_PLAY_GAMES_NAV } from "./agent-play-games-content";
import styles from "./agent-play-games.module.css";

type AgentPlayGamesChromeProps = {
  children: ReactNode;
};

export function AgentPlayGamesChrome({ children }: AgentPlayGamesChromeProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/games" className={styles.brand}>
            <span className={styles.brandMark} aria-hidden>
              AP
            </span>
            <p className={styles.brandName}>Agent Play Games</p>
          </Link>
          <nav className={styles.nav} aria-label="Agent Play Games">
            {AGENT_PLAY_GAMES_NAV.map((item) => (
              <Link key={item.href} href={item.href} className={styles.navLink}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
      <footer className={styles.footer}>
        Agent Play Games — Maple Ave arcade, APU, and APW$ in Agent Play World
      </footer>
    </div>
  );
}
