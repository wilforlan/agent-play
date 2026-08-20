import Link from "next/link";
import React from "react";

import {
  AGENT_PLAY_ANALYTICS,
  AGENT_PLAY_ANALYTICS_COPY,
  AGENT_PLAY_BOTTOM_CTA,
  AGENT_PLAY_CATEGORIES,
  AGENT_PLAY_CLI_ONBOARDING,
  AGENT_PLAY_CLI_SHOTS,
  AGENT_PLAY_FIRST_AGENT_STEPS,
  AGENT_PLAY_HERO,
  AGENT_PLAY_HOW_IT_WORKS,
  AGENT_PLAY_LOGIN_WORKSPACE,
  AGENT_PLAY_MARKETPLACE_STATS,
  AGENT_PLAY_NAV_SECTIONS,
  AGENT_PLAY_ORGANIZATION_EARNING,
  AGENT_PLAY_PILLARS,
  AGENT_PLAY_PLAYER_ACTIONS,
  AGENT_PLAY_REGISTER_PROMO,
  AGENT_PLAY_TOP_AGENTS,
  AGENT_PLAY_WORLD_SURFACES,
  type AgentPlayAgent,
} from "./agent-play-content";
import styles from "./agent-play.module.css";

export function AgentPlayFeaturedCard({
  agent,
}: {
  agent: AgentPlayAgent;
}) {
  return (
    <article className={`${styles.agentCard} ${styles.featuredCard}`}>
      <div className={styles.featuredCopy}>
        <span className={styles.badge}>Featured</span>
        <h3 className={styles.agentName}>{agent.name}</h3>
        <p className={styles.agentMeta}>
          by {agent.publisher}
          {agent.verified ? <span className={styles.verified}> Verified</span> : null}
        </p>
        <p className={styles.agentMeta}>{agent.category}</p>
        <p className={styles.muted}>{agent.summary}</p>
        <div className={styles.agentActions}>
          <Link href="/agent-play/agents" className={styles.secondaryBtn}>
            View Details
          </Link>
          <Link href="/agent-play/agents" className={styles.primaryBtn}>
            Demo
          </Link>
        </div>
      </div>
      <div className={styles.ratingPanel}>
        <span className={styles.ratingMark}>{agent.rating}</span>
        <span className={styles.metricLabel}>
          {agent.reviewCount} Reviews
        </span>
      </div>
    </article>
  );
}

export function AgentPlayAnalyticsPanel() {
  return (
    <section className={styles.card} aria-labelledby="analytics-title">
      <div className={styles.sectionHeader}>
        <h3 id="analytics-title" className={styles.sectionTitle}>
          Marketplace Analytics
        </h3>
        <p className={styles.muted}>{AGENT_PLAY_ANALYTICS.period}</p>
      </div>
      <div className={styles.grid4}>
        {AGENT_PLAY_ANALYTICS.metrics.map((metric) => (
          <div key={metric.label} className={styles.metricCard}>
            <span className={styles.metricValue}>{metric.value}</span>
            <span className={styles.metricLabel}>{metric.label}</span>
          </div>
        ))}
      </div>
      <p className={styles.agentMeta}>Lead Trend {AGENT_PLAY_ANALYTICS.leadTrend}</p>
    </section>
  );
}

export function AgentPlayMarketplaceStats() {
  return (
    <div className={styles.stats} role="list">
      {AGENT_PLAY_MARKETPLACE_STATS.map((stat) => (
        <div key={stat.label} className={styles.statCard} role="listitem">
          <span className={styles.statValue}>{stat.value}</span>
          <span className={styles.statLabel}>{stat.label}</span>
        </div>
      ))}
    </div>
  );
}

export function AgentPlayHowItWorks() {
  return (
    <ol className={styles.steps}>
      {AGENT_PLAY_HOW_IT_WORKS.map((step) => (
        <li key={step.step} className={styles.card}>
          <span className={styles.stepIndex} aria-hidden>
            {step.step.padStart(2, "0")}
          </span>
          <h3 className={styles.agentName}>{step.title}</h3>
          <p className={styles.muted}>{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function AgentPlayCategoryChips() {
  return (
    <div className={styles.chips}>
      {AGENT_PLAY_CATEGORIES.map((category) => (
        <Link
          key={category}
          href="/agent-play/agents"
          className={styles.chip}
        >
          {category}
        </Link>
      ))}
    </div>
  );
}

export function AgentPlayCatalog({ agents }: { agents: readonly AgentPlayAgent[] }) {
  return (
    <div className={styles.agentGrid}>
      {agents.map((agent) => (
        <article key={agent.name} className={styles.agentCard}>
          <span className={styles.badge}>{agent.category}</span>
          <h3 className={styles.agentName}>{agent.name}</h3>
          <p className={styles.agentMeta}>by {agent.publisher}</p>
          <p className={styles.muted}>{agent.summary}</p>
          <p className={styles.agentMeta}>
            Rated {agent.rating} · {agent.reviewCount} Reviews
          </p>
        </article>
      ))}
    </div>
  );
}

export function AgentPlayInsights() {
  return (
    <section className={styles.grid2}>
      <article className={styles.card}>
        <h3 className={styles.agentName}>{AGENT_PLAY_ANALYTICS_COPY.title}</h3>
        <p className={styles.muted}>{AGENT_PLAY_ANALYTICS_COPY.body}</p>
        <ul className={styles.checkList}>
          {AGENT_PLAY_ANALYTICS.insights.map((insight) => (
            <li key={insight}>{insight}</li>
          ))}
        </ul>
      </article>
      <article className={styles.card}>
        <h3 className={styles.agentName}>Top Performing Agents</h3>
        <ul className={styles.topList}>
          {AGENT_PLAY_TOP_AGENTS.map((agent) => (
            <li key={agent.name} className={styles.topRow}>
              <span>{agent.name}</span>
              <strong>{agent.engagement}</strong>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

export function AgentPlayRegisterPromo() {
  return (
    <section className={styles.promoBand}>
      <h2 className={styles.sectionTitle}>{AGENT_PLAY_REGISTER_PROMO.title}</h2>
      <p className={styles.sectionLead}>{AGENT_PLAY_REGISTER_PROMO.body}</p>
      <div className={styles.actions}>
        <Link href="/agent-play/register" className={styles.primaryBtn}>
          {AGENT_PLAY_REGISTER_PROMO.cta}
        </Link>
      </div>
    </section>
  );
}

export function AgentPlayBottomCta() {
  return (
    <section className={styles.ctaBand}>
      <p className={styles.kicker}>Publish</p>
      <h2 className={styles.title}>{AGENT_PLAY_BOTTOM_CTA.title}</h2>
      <p className={styles.lead}>{AGENT_PLAY_BOTTOM_CTA.body}</p>
      <div className={styles.actions}>
        <Link href="/agent-play/register" className={styles.primaryBtn}>
          {AGENT_PLAY_BOTTOM_CTA.cta}
        </Link>
      </div>
    </section>
  );
}

export function AgentPlayLandingHero() {
  return (
    <section className={styles.hero} aria-labelledby="agent-play-hero-title">
      <p className={styles.kicker}>{AGENT_PLAY_HERO.kicker}</p>
      <h1 id="agent-play-hero-title" className={styles.title}>
        {AGENT_PLAY_HERO.title}
      </h1>
      <p className={styles.lead}>{AGENT_PLAY_HERO.subtitle}</p>
      <div className={styles.actions}>
        <Link href="/agent-play/agents" className={styles.primaryBtn}>
          {AGENT_PLAY_HERO.ctaPrimary}
        </Link>
        <Link href="/agent-play/register" className={styles.secondaryBtn}>
          {AGENT_PLAY_HERO.ctaSecondary}
        </Link>
      </div>
    </section>
  );
}

export function AgentPlayWorldsSection() {
  const worldsSection = AGENT_PLAY_NAV_SECTIONS[1];

  return (
    <section className={styles.section} aria-labelledby="worlds-title">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Worlds</p>
            <h2 id="worlds-title" className={styles.sectionTitle}>
              {worldsSection.label}
            </h2>
          </div>
        </div>
      <p className={styles.sectionLead}>
        Query, operate, play, and enter the live map from the same marketplace.
      </p>
      <div className={styles.grid2}>
        {AGENT_PLAY_WORLD_SURFACES.map((surface) => {
          const isExternal =
            surface.href.startsWith("http://") ||
            surface.href.startsWith("https://");

          return (
            <article key={surface.href} className={styles.card}>
              <span className={styles.badge}>{surface.label}</span>
              <h3 className={styles.agentName}>{surface.title}</h3>
              <p className={styles.muted}>{surface.body}</p>
              <div className={styles.agentActions}>
                {isExternal ? (
                  <a
                    href={surface.href}
                    className={styles.primaryBtn}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {surface.label}
                  </a>
                ) : (
                  <Link href={surface.href} className={styles.primaryBtn}>
                    {surface.label}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function AgentPlayPillars() {
  return (
    <div className={styles.grid2}>
      {AGENT_PLAY_PILLARS.map((pillar) => (
        <article key={pillar.title} className={styles.card}>
          <h3 className={styles.agentName}>{pillar.title}</h3>
          <p className={styles.muted}>{pillar.body}</p>
        </article>
      ))}
    </div>
  );
}

export function AgentPlayPlayerActions() {
  return (
    <div className={styles.grid2}>
      {AGENT_PLAY_PLAYER_ACTIONS.map((action) => (
        <article key={action.title} className={styles.card}>
          <h3 className={styles.agentName}>{action.title}</h3>
          <p className={styles.muted}>{action.body}</p>
        </article>
      ))}
    </div>
  );
}

export function AgentPlayOrganizationEarning() {
  return (
    <section className={styles.card}>
      <h2 className={styles.sectionTitle}>
        {AGENT_PLAY_ORGANIZATION_EARNING.title}
      </h2>
      <p className={styles.muted}>{AGENT_PLAY_ORGANIZATION_EARNING.lead}</p>
      <ul className={styles.checkList}>
        {AGENT_PLAY_ORGANIZATION_EARNING.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </section>
  );
}

export function AgentPlayCliOnboarding() {
  return (
    <section className={styles.card}>
      <h2 className={styles.sectionTitle}>
        {AGENT_PLAY_CLI_ONBOARDING.installTitle}
      </h2>
      <p className={styles.muted}>
        Save your credentials.json, then initialize a host and attach agent
        nodes under this organization.
      </p>
      <pre className={styles.codeBlock}>
        {AGENT_PLAY_CLI_ONBOARDING.installCommand}
      </pre>
      <pre className={styles.codeBlock}>
        {AGENT_PLAY_CLI_ONBOARDING.createAgentCommand}
      </pre>
      <div className={styles.actions}>
        <Link
          href={AGENT_PLAY_CLI_ONBOARDING.cliDocHref}
          className={styles.primaryBtn}
        >
          CLI initialization docs
        </Link>
        <Link
          href={AGENT_PLAY_CLI_ONBOARDING.initializeDocHref}
          className={styles.secondaryBtn}
        >
          How to install and host agents
        </Link>
      </div>
    </section>
  );
}

export function AgentPlayFirstAgentGuide() {
  return (
    <section
      className={styles.section}
      aria-labelledby="first-agent-title"
    >
      <div className={styles.sectionHeader}>
        <h2 id="first-agent-title" className={styles.sectionTitle}>
          {AGENT_PLAY_LOGIN_WORKSPACE.firstAgentTitle}
        </h2>
      </div>
      <p className={styles.sectionLead}>
        {AGENT_PLAY_LOGIN_WORKSPACE.firstAgentLead}
      </p>
      <ol className={styles.steps}>
        {AGENT_PLAY_FIRST_AGENT_STEPS.map((step) => (
          <li key={step.step} className={styles.card}>
            <span className={styles.stepIndex}>{step.step}</span>
            <h3 className={styles.agentName}>{step.title}</h3>
            <p className={styles.muted}>{step.body}</p>
          </li>
        ))}
      </ol>
      <div className={styles.cliShotGrid}>
        {AGENT_PLAY_CLI_SHOTS.map((shot) => (
          <figure
            key={shot.title}
            className={styles.cliFrame}
            aria-label={shot.title}
          >
            <div className={styles.cliChrome} aria-hidden>
              <span className={styles.cliDot} />
              <span className={styles.cliDot} />
              <span className={styles.cliDot} />
              <span className={styles.cliChromeTitle}>{shot.title}</span>
            </div>
            <pre className={styles.cliBody}>
              {shot.lines.map((line) => (
                <span
                  key={`${line.kind}-${line.text}`}
                  className={
                    line.kind === "prompt" ? styles.cliPrompt : styles.cliOutput
                  }
                >
                  {line.kind === "prompt" ? `$ ${line.text}` : line.text}
                  {"\n"}
                </span>
              ))}
            </pre>
            <figcaption className={styles.cliCaption}>{shot.caption}</figcaption>
          </figure>
        ))}
      </div>
      <div className={styles.actions}>
        <Link
          href={AGENT_PLAY_CLI_ONBOARDING.cliDocHref}
          className={styles.primaryBtn}
        >
          CLI docs
        </Link>
        <Link
          href={AGENT_PLAY_CLI_ONBOARDING.initializeDocHref}
          className={styles.secondaryBtn}
        >
          Initialize walkthrough
        </Link>
      </div>
    </section>
  );
}
