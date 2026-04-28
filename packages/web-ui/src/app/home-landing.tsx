"use client";

import Link from "next/link";

export default function HomeLanding() {
  return (
    <section
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
        padding: "4rem 2rem",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Agent Play</h1>
        <p style={{ fontSize: "1.1rem", color: "#cbd5e1", marginBottom: "2rem" }}>
          Build, test, and interact with AI agents in a real-time world.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/blog" style={{ color: "#93c5fd", textDecoration: "none" }}>
            Visit Newsroom
          </Link>
          <Link href="/doc" style={{ color: "#93c5fd", textDecoration: "none" }}>
            Explore Documentation
          </Link>
          <a href="https://github.com/wilforlan/agent-play" style={{ color: "#93c5fd", textDecoration: "none" }}>
            View on Github
          </a>
        </div>
      </div>
    </section>
  );
}
