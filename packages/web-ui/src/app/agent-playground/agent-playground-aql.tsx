import Link from "next/link";
import React from "react";

import {
  AGENT_PLAYGROUND_AQL_COMMANDS,
  AGENT_PLAYGROUND_AQL_DOC_LINKS,
  AGENT_PLAYGROUND_HERO,
} from "./agent-playground-content";
import styles from "./agent-playground.module.css";

export function AgentPlaygroundAqlPage() {
  return (
    <main className={styles.main}>
      <section className={styles.hero} aria-labelledby="aql-hero-title">
        <p className={styles.kicker}>AQL</p>
        <h1 id="aql-hero-title" className={styles.title}>
          Agent Query Language (AQL)
        </h1>
        <p className={styles.subtitle}>
          AQL is the line-oriented language for inspecting Main World, talking
          to agents, and authoring spaces. Default server URL is{" "}
          {AGENT_PLAYGROUND_HERO.baseUrl}.
        </p>
        <div className={styles.heroActions}>
          <Link
            href={AGENT_PLAYGROUND_HERO.aqlPlaygroundHref}
            className={styles.primaryBtn}
          >
            Open AQL Playground
          </Link>
          <a
            href={AGENT_PLAYGROUND_HERO.liveWorldHref}
            className={styles.secondaryBtn}
          >
            Enter Main World
          </a>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="aql-docs-title">
        <h2 id="aql-docs-title" className={styles.sectionTitle}>
          Documentation
        </h2>
        <p className={styles.sectionLead}>
          Start in the playground editor, then keep the language reference open
          while you author.
        </p>
        <div className={styles.docLinks}>
          {AGENT_PLAYGROUND_AQL_DOC_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="aql-recipes-title">
        <h2 id="aql-recipes-title" className={styles.sectionTitle}>
          Recipes against Main World
        </h2>
        <div className={styles.steps}>
          {AGENT_PLAYGROUND_AQL_COMMANDS.map((command) => (
            <article key={command.title} className={styles.card}>
              <h3 className={styles.cardTitle}>{command.title}</h3>
              <p className={styles.muted}>{command.body}</p>
              <pre className={styles.codeBlock}>{command.sample}</pre>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
