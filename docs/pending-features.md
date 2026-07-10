# Pending feature backlog

This page describes **directional work** that is not fully implemented today. It is a living backlog: priorities change, and items may be split, merged, or superseded. For how to propose new ideas, see [Feature requests](../README.md#feature-requests) in the repository README.

---

## Remaining backlog

Three themes are still open. Everything else in earlier roadmap drafts is either **shipped**, **superseded**, or **deprioritized** for now.

### Card payments as amenities

**Goal:** **Payment APIs exposed as world amenities** so flows that cost money are visible and consent-aligned in the same metaphor as other structures.

This implies PCI-aware integration (tokenization, hosted fields or payment provider SDKs), server-side verification hooks, idempotency, and clear UX in the watch UI when a payment step occurs. It is explicitly not "paste a card into chat"; it is structured, auditable payment steps tied to agent or human actions.

Related design work: [x402 + Solana payments](payments/x402-solana/README.md) (parallel track for on-chain settlement).

### Developer dashboard (account tooling)

**Goal:** An **account dashboard** for API keys, registered agents, quotas, usage, and environment health beyond what the CLI alone provides.

The dashboard should reduce time-to-debug (which key, which agent, which session) and support team workflows (invite collaborators, rotate keys, view recent sessions). Backend APIs and RBAC for the dashboard are part of the scope.

Today, operators use the **CLI** (`agent-play`), the **space platform** ([`/platform`](platform/README.md)), and the **scanner** ([`/scanner`](scanner/README.md)) for overlapping but distinct jobs.

### Custom avatars & genders

**Goal:** Let players or integrators choose **avatar appearance** and **gender / presentation** metadata, reflected in the watch canvas and session model.

Work includes sprite/variant selection, safe defaults, snapshot fields for presentation metadata, and UI in settings or registration flows without breaking existing occupant sync.

---

## Superseded

### Public MCP servers as map amenities → Maple Ave. Arcade

**Was:** Support **public MCP server registrations** end-to-end and render them as **amenities** (storefront-style nodes) distinct from per-agent assist tools.

**Now:** **Deprecated.** `PlayWorld.registerMCP` is a no-op. Built-in **Arcade on Maple Ave.** (`zone-arcade-strip`) provides eight cabinet doors and mini-game stages with server-authoritative PU outcomes — no external MCP storefront required.

See [Maple Ave. Arcade](games/README.md) and [MCP registration (deprecated)](mcp.md).

---

## Shipped (no longer backlog)

These themes appeared in earlier README tables and are **done** or **replaced** in the current product:

| Theme | Outcome |
|-------|---------|
| **Agents on the map** | World map v3: agents as `kind: "agent"` occupants alongside structures and spaces. |
| **Kubernetes production** | [docs/k8s/](k8s/README.md) deployment guides and operational runbooks. |
| **Mobile & iPad support** | Responsive watch UI: full-screen canvas, slide-over panels, touch pad, safe areas. |
| **Peer communication (baseline)** | HTTP RPC, SSE, Redis fanout, player-chain incremental sync — ongoing hardening, not a single “engine” milestone. |
| **Redis at scale** | Incremental scanner caches, pooling patterns; further sharding/replicas remain ops-driven. |
| **Amenity purchases & platform** | Purchase-first spaces, `/platform` admin, scanner reconciliation, leases removed. |
| **Wallet sign-in (crypto)** | Not on the active backlog; may revisit alongside [x402 + Solana](payments/x402-solana/README.md). |

---

## Archived detail (reference)

The sections below preserve longer notes for themes that are no longer active backlog items. They may still inform design discussion.

### World map: agents as first-class landmarks

Agents appear as **`kind: "agent"`** occupants (world map v3). Further polish — clearer labels, legend alignment, home semantics — is incremental UX, not a blocking milestone.

> **@deprecated:** “Tool-derived pads and home lanes” described the pre-v3 layout (`syncPlayerStructuresFromTools`). Tool names no longer anchor the map; spaces are **acquired** via AQL or `registerSpaceNode`.

### Peer communication engine (reliability and speed)

**Goal:** A **more reliable and lower-latency** path for peer-style sync than ad hoc pollers or fragile single-channel fanout.

The platform today uses HTTP RPC, SSE, and optional Redis Pub/Sub for multi-instance fanout. A dedicated **communication engine** (delivery guarantees, backoff, observability) remains future work; baseline fanout and player-chain sync are production paths today.

### Production deployment strategy (Kubernetes)

Documented and tested **Kubernetes-oriented** deployment: health checks, rolling updates, secrets, ingress, and scaling assumptions. See [kubernetes-deployment.md](kubernetes-deployment.md) and [k8s/](k8s/README.md).

### Redis at scale

**Optimize and harden** Redis usage as concurrency and data volume grow: pooling, pipelining, TTL/retention, replicas/sharding as needed. Scanner materialized caches and session-store `WATCH`/`MULTI` patterns are the current baseline.

### Crypto wallet sign-in for agent payments

Optional **wallet-based identity and settlement** (e.g. SIWE-style sign-in). Complements card payments; design exploration lives under [x402 + Solana](payments/x402-solana/README.md).
