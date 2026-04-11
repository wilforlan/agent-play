import Link from "next/link";
import { buildPlatformAnalyticsPayload } from "@/server/agent-play/platform-analytics-payload";
import { getSharedRedisClient } from "@/server/get-world";
import { StatsCharts } from "./stats-charts";
import styles from "./stats-page.module.css";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const redis = getSharedRedisClient();
  if (redis === null) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <h1 className={styles.title}>Platform stats</h1>
          </header>
          <div className={styles.unavailable} role="alert">
            <h2 className={styles.unavailableTitle}>Analytics unavailable</h2>
            <p>
              The stats service needs a configured data store. Try again later or visit the
              playground.
            </p>
          </div>
          <nav className={styles.nav} aria-label="Primary">
            <Link href="/">Back to Agent Play</Link>
          </nav>
        </div>
      </div>
    );
  }

  const hostId = process.env.AGENT_PLAY_HOST_ID ?? "default";
  const data = await buildPlatformAnalyticsPayload({ redis, hostId });

  return (
    <div className={styles.page}>
      <main className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.title}>Platform stats</h1>
          <p className={styles.lede}>
            Domain-level aggregates for Agent Play: main identities, agent credentials, and live
            world signals. No personal data or secrets are exposed here.
          </p>
          <nav className={styles.nav} aria-label="Primary">
            <Link href="/">Play</Link>
            {" · "}
            <Link href="/agent-play/watch">Watch</Link>
          </nav>
        </header>

        <section aria-labelledby="metrics-heading">
          <h2 id="metrics-heading" className={styles.srOnly}>
            Core counts
          </h2>
          <div className={styles.grid}>
            <article className={styles.card}>
              <h3 className={styles.cardTitle}>Genesis nodes</h3>
              <p className={styles.cardValue}>{data.cards.genesisNodeCount}</p>
              <p className={styles.cardHint}>{data.definitions.genesisNode}</p>
            </article>
            <article className={styles.card}>
              <h3 className={styles.cardTitle}>Main nodes</h3>
              <p className={styles.cardValue}>{data.cards.mainNodeAccounts}</p>
              <p className={styles.cardHint}>{data.definitions.mainNodeAccounts}</p>
            </article>
            <article className={styles.card}>
              <h3 className={styles.cardTitle}>Agent node credentials</h3>
              <p className={styles.cardValue}>{data.cards.agentNodeCredentials}</p>
              <p className={styles.cardHint}>{data.definitions.agentNodeCredentials}</p>
            </article>
            <article className={styles.card}>
              <h3 className={styles.cardTitle}>In-world agents</h3>
              <p className={styles.cardValue}>{data.cards.inWorldAgentRecords}</p>
              <p className={styles.cardHint}>{data.definitions.inWorldAgents}</p>
            </article>
          </div>
        </section>

        <StatsCharts data={data} />

        <footer className={styles.meta}>
          <p>Host: {data.hostId}</p>
          <p>Generated: {data.generatedAt}</p>
        </footer>
      </main>
    </div>
  );
}
