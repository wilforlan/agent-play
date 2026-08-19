import Link from "next/link";
import React from "react";

import { AgentPlayGamesBreadcrumbJsonLd } from "@/components/agent-play-games-breadcrumb-json-ld";
import { AgentPlayGamesJsonLd } from "@/components/agent-play-games-json-ld";

import {
  AGENT_PLAY_GAMES_UNITS,
  amenityPurchaseApu,
} from "./agent-play-games-content";
import styles from "./agent-play-games.module.css";

export function AgentPlayGamesUnitsPage() {
  return (
    <main className={styles.main}>
      <AgentPlayGamesJsonLd slug={["units"]} />
      <AgentPlayGamesBreadcrumbJsonLd slug={["units"]} />
      <section className={styles.hero} aria-labelledby="units-hero-title">
        <p className={styles.kicker}>{AGENT_PLAY_GAMES_UNITS.kicker}</p>
        <h1 id="units-hero-title" className={styles.title}>
          {AGENT_PLAY_GAMES_UNITS.title}
        </h1>
        <p className={styles.subtitle}>{AGENT_PLAY_GAMES_UNITS.lead}</p>
        <div className={styles.heroActions}>
          <Link href="/games" className={styles.secondaryBtn}>
            Arcade catalog
          </Link>
          <Link href="/" className={styles.primaryBtn}>
            Open wallet in world
          </Link>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="symbols-title">
        <h2 id="symbols-title" className={styles.sectionTitle}>
          The two counters
        </h2>
        <div className={styles.grid2}>
          <article className={styles.card}>
            <p className={styles.cabinet}>{AGENT_PLAY_GAMES_UNITS.apw.symbol}</p>
            <h3 className={styles.cardTitle}>{AGENT_PLAY_GAMES_UNITS.apw.name}</h3>
            <p className={styles.muted}>
              Field {AGENT_PLAY_GAMES_UNITS.apw.field}. Seeded at $
              {AGENT_PLAY_GAMES_UNITS.apw.seedUsd.toFixed(2)} on first wallet
              read.
            </p>
            <p className={styles.muted}>{AGENT_PLAY_GAMES_UNITS.apw.howCounted}</p>
          </article>
          <article className={styles.card}>
            <p className={styles.cabinet}>{AGENT_PLAY_GAMES_UNITS.apu.symbol}</p>
            <h3 className={styles.cardTitle}>{AGENT_PLAY_GAMES_UNITS.apu.name}</h3>
            <p className={styles.muted}>
              Field {AGENT_PLAY_GAMES_UNITS.apu.field}. Arcade cap{" "}
              {String(AGENT_PLAY_GAMES_UNITS.apu.dailyArcadeCap)} / UTC day.
              Streak +{String(AGENT_PLAY_GAMES_UNITS.apu.streakBonus)} at{" "}
              {String(AGENT_PLAY_GAMES_UNITS.apu.streakThresholdDays)} days.
            </p>
            <p className={styles.muted}>{AGENT_PLAY_GAMES_UNITS.apu.howCounted}</p>
          </article>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="count-title">
        <h2 id="count-title" className={styles.sectionTitle}>
          How they count
        </h2>
        <ol className={styles.list}>
          {AGENT_PLAY_GAMES_UNITS.howTheyCount.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="earn-title">
        <h2 id="earn-title" className={styles.sectionTitle}>
          Earning rates
        </h2>
        <p className={styles.sectionLead}>
          Arcade is capped. Purchases, talk, and referrals are separate mint
          paths. A $4.99 amenity item yields {String(amenityPurchaseApu(4.99))}{" "}
          APU.
        </p>
        <div className={styles.grid2}>
          {AGENT_PLAY_GAMES_UNITS.earningRates.map((rate) => (
            <article key={rate.id} className={styles.card}>
              <h3 className={styles.cardTitle}>{rate.title}</h3>
              <p className={styles.muted}>{rate.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="spend-title">
        <h2 id="spend-title" className={styles.sectionTitle}>
          How to spend them
        </h2>
        <ol className={styles.list}>
          {AGENT_PLAY_GAMES_UNITS.howToSpend.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <table className={styles.rateTable}>
          <thead>
            <tr>
              <th>Bundle</th>
              <th>APU cost</th>
              <th>APW$ credit</th>
              <th>APU per dollar</th>
            </tr>
          </thead>
          <tbody>
            {AGENT_PLAY_GAMES_UNITS.bundles.map((bundle) => (
              <tr key={bundle.id}>
                <td>{bundle.id}</td>
                <td className={styles.pu}>{String(bundle.apuCost)} APU</td>
                <td>${bundle.creditUsd.toFixed(2)}</td>
                <td>
                  {(bundle.apuCost / bundle.creditUsd).toFixed(1)} APU / $
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
