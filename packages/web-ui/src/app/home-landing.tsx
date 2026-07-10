"use client";

import Link from "next/link";

import styles from "./home-landing.module.css";
import {
  dispatchScrollToGame,
  HOME_LANDING_ARTICLES,
  HOME_LANDING_CONTROLS,
  HOME_LANDING_HERO,
  HOME_LANDING_PILLARS,
  HOME_LANDING_STATS,
  HOME_LANDING_WORLD_MODEL_INTRO,
} from "./home-landing-articles";

export default function HomeLanding() {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.nav}>
          <p className={styles.navBrand}>Agent Play</p>
          <nav className={styles.navLinks} aria-label="Site">
            <Link href="/blog" className={styles.navLink}>
              Newsroom
            </Link>
            <Link href="/doc" className={styles.navLink}>
              Documentation
            </Link>
            <Link href="/playground" className={styles.navLink}>
              Playground
            </Link>
            <a
              href="https://github.com/wilforlan/agent-play"
              className={styles.navLink}
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </nav>
        </header>

        <section className={styles.hero} aria-labelledby="home-hero-title">
          <div className={styles.heroGlow} aria-hidden />
          <div className={styles.heroMesh} aria-hidden />
          <p className={styles.heroKicker}>{HOME_LANDING_HERO.kicker}</p>
          <h1 id="home-hero-title" className={styles.heroTitle}>
            {HOME_LANDING_HERO.title}
          </h1>
          <p className={styles.heroTagline}>{HOME_LANDING_HERO.tagline}</p>
          <p className={styles.heroSubtitle}>{HOME_LANDING_HERO.subtitle}</p>
          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => dispatchScrollToGame()}
            >
              {HOME_LANDING_HERO.ctaPrimary}
            </button>
            <Link href="/doc" className={styles.secondaryBtn}>
              {HOME_LANDING_HERO.ctaSecondary}
            </Link>
          </div>
          <div className={styles.stats} role="list">
            {HOME_LANDING_STATS.map((stat) => (
              <div key={stat.label} className={styles.statCard} role="listitem">
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section
          className={styles.worldIntro}
          aria-labelledby="world-model-title"
        >
          <h2 id="world-model-title" className={styles.worldIntroTitle}>
            {HOME_LANDING_WORLD_MODEL_INTRO.title}
          </h2>
          <p className={styles.worldIntroLead}>
            {HOME_LANDING_WORLD_MODEL_INTRO.lead}
          </p>
        </section>

        {HOME_LANDING_PILLARS.map((pillar, index) => (
          <section
            key={pillar.id}
            className={styles.modelSection}
            aria-labelledby={`model-${pillar.id}-title`}
          >
            <p className={styles.modelStreet}>{pillar.street}</p>
            <h3 id={`model-${pillar.id}-title`} className={styles.modelTitle}>
              {pillar.title}
            </h3>
            <p className={styles.modelSummary}>{pillar.summary}</p>
            <h4 className={styles.modelHowLabel}>How to play</h4>
            {pillar.howToPlay.map((paragraph) => (
              <p key={paragraph} className={styles.modelParagraph}>
                {paragraph}
              </p>
            ))}
            {index < HOME_LANDING_PILLARS.length - 1 ? (
              <hr className={styles.modelDivider} />
            ) : null}
          </section>
        ))}

        <section className={styles.section} aria-labelledby="articles-title">
          <div className={styles.sectionHeader}>
            <p className={styles.sectionKicker}>Deep dives</p>
            <h2 id="articles-title" className={styles.sectionTitle}>
              Ecosystem, economy, and safety
            </h2>
            <p className={styles.sectionLead}>
              Power-Ups, dollars, touch controls, debug tooling, and node
              credentials—everything around the three streets.
            </p>
          </div>
          <div className={styles.articleGrid}>
            {HOME_LANDING_ARTICLES.map((article) => (
              <article key={article.id} className={styles.articleCard}>
                <span className={styles.articleTag}>{article.tag}</span>
                <h3 className={styles.articleTitle}>{article.title}</h3>
                <p className={styles.articleExcerpt}>{article.excerpt}</p>
                <ul className={styles.articleList}>
                  {article.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
                {article.href !== undefined ? (
                  <Link href={article.href} className={styles.articleLink}>
                    Read more
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="controls-title">
          <div className={styles.sectionHeader}>
            <p className={styles.sectionKicker}>Controls</p>
            <h2 id="controls-title" className={styles.sectionTitle}>
              Touch bar, panels, and shortcuts
            </h2>
          </div>
          <div className={styles.controlsPanel}>
            <div className={styles.controlsCopy}>
              <p>
                The bottom informatics bar hosts chat settings, session tools,
                and profile toggles. On mobile, collapse it to reclaim screen
                space—the caret rotates when minimized.
              </p>
              <p>
                The proximity touch pad floats over the canvas with Assist,
                Chat, Push-to-talk, Wallet, and context actions when you are
                near agents, cabinets, or amenity items.
              </p>
              <p>
                Debug mode unlocks zone overlays and occupancy grids for
                authors tuning spawn and structure anchors.
              </p>
            </div>
            <div className={styles.keyGrid} aria-label="Keyboard shortcuts">
              {HOME_LANDING_CONTROLS.map((control) => (
                <div key={control.key} className={styles.keyChip}>
                  <span className={styles.keyLetter}>{control.key}</span>
                  <span className={styles.keyLabel}>{control.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerText}>
            Agent Play — Spatial AI Playground. Protect your node passphrase; it
            gates wallet, intercom, and playground access.
          </p>
          <div className={styles.footerLinks}>
            <Link href="/blog" className={styles.navLink}>
              Newsroom
            </Link>
            <Link href="/stats" className={styles.navLink}>
              Platform stats
            </Link>
            <Link href="/scanner" className={styles.navLink}>
              Scanner
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
