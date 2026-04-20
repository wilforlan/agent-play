import styles from "./p2a-landing.module.css";

export const metadata = {
  title: "Agent Play P2A + Intercom Address",
  description:
    "Peer to Agent communication and intercom-address routing for Agent Ringer in Agent Play.",
};

const ROUTING_STEPS = [
  "Sender targets intercom-address://{channelKey}",
  "Web UI intercom forwarder resolves the channel key",
  "Existing world:intercom events carry normalized payloads",
  "Play UI receives completed responses on the / page",
  "Ringer plays direct or preface flow based on presence",
];

const FEATURE_CARDS = [
  {
    title: "Open inbound endpoint",
    body: "Anyone with your intercom-address can leave text, audio, or media messages that route through existing intercom channels.",
  },
  {
    title: "Assist-first execution model",
    body: "Assist tools remain the world background runtime. Long-running responses are delivered through the same intercom response path.",
  },
  {
    title: "No new event transport",
    body: "P2A uses current world:intercom event flow. Playback begins only after the response reaches a terminal ready state.",
  },
  {
    title: "Presence-aware ringer behavior",
    body: "If you are present, play message directly. If away, play ringtone for six seconds, then the incoming-message preface.",
  },
];

export default function AgentPlayP2AImplementationPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>Agent Play Frontend Communication</p>
        <h1 className={styles.title}>P2A + Intercom Address</h1>
        <p className={styles.subtitle}>
          Intercom-address is the routing identity layer for Agent Ringer on the
          frontend. It powers shareable inbound communication and delivery to the
          main experience on <code>/</code>.
        </p>
        <div className={styles.addressBlock}>
          <span className={styles.addressLabel}>Canonical format</span>
          <code className={styles.addressValue}>
            intercom-address://{"{channelKey}"}
          </code>
        </div>
      </section>

      <section className={styles.grid}>
        {FEATURE_CARDS.map((card) => (
          <article key={card.title} className={styles.card}>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <section className={styles.section}>
        <h2>Routing Strategy</h2>
        <ol className={styles.steps}>
          {ROUTING_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className={styles.section}>
        <h2>How it works on the / page</h2>
        <ul className={styles.list}>
          <li>
            Toggle <strong>P2A</strong> near the world chat counter to enable
            P2A response handling.
          </li>
          <li>
            The intercom-address panel appears only when P2A is on, with copy
            and share actions.
          </li>
          <li>
            Inbound messages are shown across the page surfaces and replayed by
            the ringer flow after response receipt.
          </li>
          <li>
            The implementation remains backward compatible with existing assist
            and world chat behavior.
          </li>
        </ul>
      </section>
    </main>
  );
}
