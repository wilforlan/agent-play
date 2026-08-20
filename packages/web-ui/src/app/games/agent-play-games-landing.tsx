import Link from "next/link";
import React from "react";

import { AgentPlayGamesBreadcrumbJsonLd } from "@/components/agent-play-games-breadcrumb-json-ld";
import { AgentPlayGamesJsonLd } from "@/components/agent-play-games-json-ld";

import {
  AGENT_PLAY_GAMES_FAQ,
  AGENT_PLAY_GAMES_HERO,
  AGENT_PLAY_GAMES_HOW_TO_PLAY,
  AGENT_PLAY_GAMES_PAGES,
  AGENT_PLAY_GAMES_WIN_LOOP,
} from "./agent-play-games-content";
import styles from "./agent-play-games.module.css";

export function AgentPlayGamesLanding() {
  return (
    <main className={styles.main}>
      <AgentPlayGamesJsonLd slug={[]} />
      <AgentPlayGamesBreadcrumbJsonLd slug={[]} />
      <section className={styles.hero} aria-labelledby="games-hero-title">
        <p className={styles.kicker}>{AGENT_PLAY_GAMES_HERO.kicker}</p>
        <h1 id="games-hero-title" className={styles.title}>
          {AGENT_PLAY_GAMES_HERO.title}
        </h1>
        <p className={styles.subtitle}>{AGENT_PLAY_GAMES_HERO.subtitle}</p>
        <div className={styles.heroActions}>
          <Link href={AGENT_PLAY_GAMES_HERO.liveWorldHref} className={styles.primaryBtn}>
            Enter Agent Play World
          </Link>
          <Link href={AGENT_PLAY_GAMES_HERO.unitsHref} className={styles.secondaryBtn}>
            World units
          </Link>
          <Link href={AGENT_PLAY_GAMES_HERO.docsHref} className={styles.secondaryBtn}>
            Arcade specs
          </Link>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="cabinets-title">
        <h2 id="cabinets-title" className={styles.sectionTitle}>
          Maple Ave cabinets
        </h2>
        <p className={styles.sectionLead}>
          Every door is a mini-game stage. Walk up, press A or Play, and the
          server scores the round into APU. Featured rotates by UTC weekday.
        </p>
        <div className={styles.grid2}>
          {AGENT_PLAY_GAMES_PAGES.map((page) => (
            <article key={page.slug} className={styles.card}>
              <Link href={`/games/${page.slug}`} className={styles.cardLink}>
                <p className={styles.cabinet}>{page.cabinetName}</p>
                <h3 className={styles.cardTitle}>{page.title}</h3>
                <p className={styles.muted}>{page.lead}</p>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="how-title">
        <h2 id="how-title" className={styles.sectionTitle}>
          How to play
        </h2>
        <div className={styles.steps}>
          {AGENT_PLAY_GAMES_HOW_TO_PLAY.map((step) => (
            <article key={step.step} className={styles.step}>
              <span className={styles.stepIndex}>{step.step}</span>
              <div>
                <h3 className={styles.cardTitle}>{step.title}</h3>
                <p className={styles.muted}>{step.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="win-title">
        <h2 id="win-title" className={styles.sectionTitle}>
          How arcade play wins the world
        </h2>
        <p className={styles.sectionLead}>
          Cabinets are not a side lobby. They train the map, fill APU, and
          convert into APW$ you spend on amenities that every viewer can see.
        </p>
        <ol className={styles.list}>
          {AGENT_PLAY_GAMES_WIN_LOOP.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="faq-title">
        <h2 id="faq-title" className={styles.sectionTitle}>
          Questions
        </h2>
        <div className={styles.grid2}>
          {AGENT_PLAY_GAMES_FAQ.map((item) => (
            <article key={item.question} className={styles.card}>
              <h3 className={styles.cardTitle}>{item.question}</h3>
              <p className={styles.muted}>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
