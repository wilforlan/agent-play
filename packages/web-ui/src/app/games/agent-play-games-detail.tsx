import Link from "next/link";
import React from "react";

import { AgentPlayGamesBreadcrumbJsonLd } from "@/components/agent-play-games-breadcrumb-json-ld";
import { AgentPlayGamesJsonLd } from "@/components/agent-play-games-json-ld";

import {
  formatSignedApu,
  type AgentPlayGamePage,
} from "./agent-play-games-content";
import styles from "./agent-play-games.module.css";

type AgentPlayGamesDetailProps = {
  page: AgentPlayGamePage;
};

const puClass = (pu: number): string => {
  return pu < 0 ? styles.puNeg : styles.pu;
};

export function AgentPlayGamesDetail({ page }: AgentPlayGamesDetailProps) {
  return (
    <main className={styles.main}>
      <AgentPlayGamesJsonLd slug={[page.slug]} />
      <AgentPlayGamesBreadcrumbJsonLd slug={[page.slug]} />
      <section className={styles.hero} aria-labelledby="game-hero-title">
        <p className={styles.kicker}>{page.kicker}</p>
        <h1 id="game-hero-title" className={styles.title}>
          {page.title}
        </h1>
        <p className={styles.subtitle}>{page.lead}</p>
        <div className={styles.heroActions}>
          <Link href="/" className={styles.primaryBtn}>
            Play on Maple Ave
          </Link>
          <Link href="/games/units" className={styles.secondaryBtn}>
            World units
          </Link>
          <Link href="/games" className={styles.secondaryBtn}>
            All cabinets
          </Link>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="loop-title">
        <h2 id="loop-title" className={styles.sectionTitle}>
          How to play
        </h2>
        <ol className={styles.list}>
          {page.playLoop.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="world-title">
        <h2 id="world-title" className={styles.sectionTitle}>
          How this helps you win the play world
        </h2>
        <ul className={styles.list}>
          {page.worldAdvantage.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {page.puRates.length > 0 ? (
        <section className={styles.section} aria-labelledby="rates-title">
          <h2 id="rates-title" className={styles.sectionTitle}>
            Earning rates
          </h2>
          <p className={styles.sectionLead}>
            The client sends events. The server computes APU. These numbers are
            the live scoring table, not a client estimate.
          </p>
          <table className={styles.rateTable}>
            <thead>
              <tr>
                <th>Event</th>
                <th>APU</th>
              </tr>
            </thead>
            <tbody>
              {page.puRates.map((rate) => (
                <tr key={rate.label}>
                  <td>{rate.label}</td>
                  <td className={puClass(rate.pu)}>{formatSignedApu(rate.pu)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </main>
  );
}
