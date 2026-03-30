# Pending feature backlog

This page describes **directional work** that is not fully implemented today. It is a living backlog: priorities change, and items may be split, merged, or superseded. For how to propose new ideas, see [Feature requests](../README.md#feature-requests) in the repository README.

---

## World map: agents as first-class structures

**Goal:** Make every registered agent legible on the world map as a **structure** or **landmark**, not only as a moving avatar or abstract grid cell.

Today, tool-derived pads and home lanes anchor much of the layout. The backlog item is to **treat the agent presence itself** as part of the spatial vocabulary: clear labels, consistent placement rules, and map semantics so observers instantly see *who* occupies *which* slice of the world. That includes refining how multiple agents share bounds, how "home" relates to per-agent identity, and how the canvas legend matches server snapshot data.

---

## Public MCP servers as map amenities

**Goal:** Support **public MCP server registrations** end-to-end and render them as **amenities** (e.g. storefront-style nodes) distinct from per-agent tool structures.

Work spans trust and discovery (what "public" means), API shape for listing and registering servers, snapshot and SSE updates so all viewers see the same amenities, and play UI affordances (icons, labels, links) so MCP endpoints read as **shared infrastructure** rather than private tools. This aligns with the vendor vs. store metaphor used elsewhere in the docs.

---

## Peer communication engine (reliability and speed)

**Goal:** A **more reliable and lower-latency** path for peer-style sync than ad hoc pollers or fragile single-channel fanout.

The platform today uses HTTP RPC, SSE, and optional Redis Pub/Sub for multi-instance fanout. The backlog item is a deliberate **communication engine**: clearer delivery guarantees, backoff and resume semantics, optional binary or multiplexed channels where appropriate, and observability (metrics, tracing) so operators can see lag and drops. "P2P" here means **many equal viewers and integrations** talking to the same world; browser-to-browser WebRTC is not assumed as the first implementation.

---

## Production deployment strategy (Kubernetes)

**Goal:** Documented and tested **Kubernetes-oriented** deployment: health checks, rolling updates, secrets, ingress, and horizontal scaling assumptions.

This includes how many replicas are safe with shared Redis, sticky sessions vs. stateless API design, snapshot and SSE behavior through load balancers, and CI/CD hooks for **reliable production releases** (preview environments, migration notes, versioned images). The outcome is that a team can adopt Agent Play in a cluster without reverse-engineering env vars and failure modes.

---

## Redis at scale

**Goal:** **Optimize and harden** Redis usage as concurrency and data volume grow.

Candidates include connection pooling tuning, pipeline batching for session persistence, key TTL and retention policies, read replicas or sharded layouts if a single instance becomes a bottleneck, and circuit breakers when Redis is degraded. The work should stay compatible with the existing `AgentRepository` and session store contracts while making cost and tail latency predictable.

---

## Payments as amenities (card)

**Goal:** **Payment APIs exposed as world amenities** so flows that cost money are visible and consent-aligned in the same metaphor as other structures.

This implies PCI-aware integration (tokenization, hosted fields or payment provider SDKs), server-side verification hooks, idempotency, and clear UX in the watch UI when a payment step occurs. It is explicitly not "paste a card into chat"; it is structured, auditable payment steps tied to agent or human actions.

---

## Crypto wallet sign-in for agent payments

**Goal:** Optional **wallet-based identity and settlement** for agent-related payments or entitlements.

Work includes choosing chains and standards (e.g. SIWE-style sign-in, chain-specific constraints), bridge to account or session model, and fraud and key-handling policies. This complements card payments where teams or users prefer on-chain flows.

---

## Account dashboard (developer tooling)

**Goal:** An **account dashboard** for API keys, registered agents, quotas, usage, and environment health beyond what the CLI alone provides.

The dashboard should reduce time-to-debug (which key, which agent, which session) and support team workflows (invite collaborators, rotate keys, view recent sessions). Backend APIs and RBAC for the dashboard are part of the scope.
