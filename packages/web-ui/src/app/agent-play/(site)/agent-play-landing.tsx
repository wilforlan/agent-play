import Link from "next/link";
import React from "react";

import { AGENT_PLAY_FEATURED_AGENT } from "./agent-play-content";
import {
  AgentPlayAnalyticsPanel,
  AgentPlayBottomCta,
  AgentPlayCategoryChips,
  AgentPlayFeaturedCard,
  AgentPlayHowItWorks,
  AgentPlayInsights,
  AgentPlayLandingHero,
  AgentPlayMarketplaceStats,
  AgentPlayPillars,
  AgentPlayRegisterPromo,
  AgentPlayWorldsSection,
} from "./agent-play-sections";
import styles from "./agent-play.module.css";

export function AgentPlayLanding() {
  return (
    <main className={styles.main}>
      <AgentPlayLandingHero />

      <AgentPlayWorldsSection />

      <section className={styles.section} aria-labelledby="featured-agent-title">
        <div className={styles.sectionHeader}>
          <h2 id="featured-agent-title" className={styles.sectionTitle}>
            Featured Agent
          </h2>
        </div>
        <AgentPlayFeaturedCard agent={AGENT_PLAY_FEATURED_AGENT} />
      </section>

      <section className={styles.section}>
        <AgentPlayAnalyticsPanel />
      </section>

      <section className={styles.section}>
        <AgentPlayRegisterPromo />
      </section>

      <section className={styles.section}>
        <AgentPlayMarketplaceStats />
      </section>

      <section
        className={styles.section}
        aria-labelledby="pillars-title"
      >
        <h2 id="pillars-title" className={styles.sectionTitle}>
          Built for Discovery, Publishing, and Growth
        </h2>
        <p className={styles.sectionLead}>
          Public catalogs, organization onboarding, conversion tracking, and
          publisher analytics in one marketplace.
        </p>
        <AgentPlayPillars />
      </section>

      <section
        className={styles.section}
        aria-labelledby="how-it-works-title"
      >
        <h2 id="how-it-works-title" className={styles.sectionTitle}>
          How Agent Play Works
        </h2>
        <AgentPlayHowItWorks />
      </section>

      <section
        className={styles.section}
        aria-labelledby="featured-agents-title"
      >
        <div className={styles.sectionHeader}>
          <h2 id="featured-agents-title" className={styles.sectionTitle}>
            Featured Agents
          </h2>
          <Link href="/agent-play/agents" className={styles.navLink}>
            View all agents
          </Link>
        </div>
        <p className={styles.empty}>No featured agents available yet.</p>
      </section>

      <section className={styles.section}>
        <AgentPlayInsights />
      </section>

      <section className={styles.section} aria-labelledby="categories-title">
        <h2 id="categories-title" className={styles.sectionTitle}>
          Browse by Category
        </h2>
        <AgentPlayCategoryChips />
      </section>

      <section className={styles.section}>
        <AgentPlayBottomCta />
      </section>
    </main>
  );
}
