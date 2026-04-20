# Intercom-address architecture

## Purpose

This document defines **intercom-address** as the core addressing model for Agent Play P2A communication and Agent Ringer delivery on frontend user experiences.

Intercom-address enables open inbound messaging to a user-facing endpoint, where senders can leave:

- text messages,
- audio messages,
- media messages.

Messages addressed to an intercom-address are resolved through world intercom routing and surfaced on the `/` page so frontend users can see and act on them.

## Why intercom-address exists

Agent Play already has channel-keyed intercom flows. Intercom-address builds on that by providing a user-shareable, frontend-friendly identity format that can be:

- displayed in UI,
- copied/shared,
- used as a connection target for peer messaging and conferencing-style sessions.

This makes addressing explicit and human-usable without changing the underlying routing model.

## Core definition

Canonical format:

`intercom-address://{channelKey}`

Where:

- `channelKey` is the routing identity backing intercom delivery.
- `intercom-address` is the shareable URI-like representation used in product UI and client APIs.

## Role in P2A architecture

Intercom-address is the core of P2A because it unifies:

- **identity**: where a message is sent,
- **routing**: how intercom forwarding resolves recipients,
- **frontend UX**: what users share and monitor,
- **ringer delivery**: where message playback/display is anchored.

In P2A, assist tool outputs and intercom responses are not isolated events; they are tied to an intercom-address that determines the final user-facing destination.

## Agent Ringer enablement for frontend users

For frontend users, Agent Ringer is enabled by intercom-address-first interaction:

1. User enables P2A on the `/` page.
2. UI shows the active `intercom-address://{channelKey}`.
3. User can share this address.
4. Any sender with the address can connect and leave text/audio/media.
5. Message delivery is resolved via world intercom forwarding.
6. Received content is displayed on `/`.
7. Audio playback follows presence-aware policy from P2A docs.

## Design goals

- One stable address model for P2A inbound delivery.
- Reuse existing intercom/channel-key runtime contracts.
- Keep SDK surface unchanged in this phase.
- Keep frontend implementation explicit and observable.
- Support peer messaging and conferencing-room style collaboration.

## Address lifecycle

### Generation

- Derived from current user/session `channelKey`.
- Constructed client-side or server-side as:
  - `intercom-address://{channelKey}`

### Display

- Visible on `/` when P2A is enabled.
- Rendered as read-only, with copy/share controls.

### Sharing

- Can be shared directly with other users/participants.
- Shared address is a connection target for peer-to-peer style communication.

### Resolution

- Incoming payload targets `intercom-address`.
- Forwarder resolves `channelKey` from the address.
- Delivery uses existing intercom routing path.

### Expiration/rotation

- Address validity should follow channel/session lifecycle.
- Rotation policy can be user-triggered or session-triggered.

## Supported message kinds

Intercom-address accepts and routes:

- **Text**: plain message content displayed in message surfaces on `/`.
- **Audio**: playable voice content delivered through ringer playback path.
- **Media**: attachment metadata and previewable media content for frontend rendering.

## Message envelope (conceptual)

```ts
type IntercomAddressMessage = {
  requestId: string;
  intercomAddress: `intercom-address://${string}`;
  channelKey: string;
  from: {
    senderId: string;
    senderName?: string;
  };
  to: {
    recipientId?: string;
  };
  kind: "text" | "audio" | "media";
  text?: string;
  audio?: {
    encoding: "pcm" | "wav" | "mp3" | "opus";
    dataBase64: string;
    durationMs?: number;
  };
  media?: {
    mediaType: "image" | "video" | "file";
    url: string;
    title?: string;
  };
  ts: string;
};
```

## Frontend implementation blueprint (`/` page)

## UI components

- P2A toggle (`enable P2A audio communication`).
- Help button (`?`) linking to `/agent-play-p2a-implementation`.
- Intercom-address card:
  - current address value,
  - copy button,
  - share button,
  - connection state badge.
- Inbound inbox/feed:
  - shows text/audio/media items delivered to current address.

## Display requirement

Inbound intercom-address messages should be displayed on `/` regardless of whether they came from direct peer send, assist-driven response, or ringer-mediated forwarding.

## Playback behavior

Use existing P2A presence-aware policy:

- User present: play direct message content (`{message from target}`) for audio response paths.
- User not present: play ringtone (~6s) then the incoming-message preface and content.

## Routing and forwarding design

Intercom-address does not replace channel-key routing. It wraps it.

Forwarding steps:

1. Parse `intercom-address://{channelKey}`.
2. Validate channel access.
3. Resolve recipient route from channel key.
4. Forward via existing world intercom path.
5. Emit/consume existing intercom events for state updates.
6. Render received payload on `/`.

## Existing events strategy

No new domain events are required in this phase.

Use current intercom/world events for:

- terminal response detection,
- message delivery updates,
- transcript/diagnostic rendering.

Speech playback starts only after response/message is received through existing event flow and reaches client-ready state.

## Security and trust model

Because intercom-address is shareable and open by design, apply protection controls:

- channel access validation for inbound senders;
- address expiration/rotation support;
- rate limits and anti-spam controls;
- content-type validation (`text`/`audio`/`media`);
- media URL safety checks and sanitization in UI;
- abuse reporting and moderation hooks (future phase).

Open-connectivity principle:

- Anyone with the address can attempt to connect and leave a message.
- Acceptance, rendering, and playback still run through validation/policy checks.

## Observability

Track:

- inbound attempts by address,
- accepted vs rejected deliveries,
- playback success/failure,
- message kind distribution (text/audio/media),
- time to display on `/`.

## Implementation phases

### Phase 1: docs and UI contract

- Finalize intercom-address format and copy/share UX.
- Document inbound message display requirements for `/`.

### Phase 2: forwarding integration

- Parse/resolve intercom-address in forwarding layer.
- Ensure channel-key routing remains canonical.

### Phase 3: frontend inbox and ringer playback

- Add address card and inbound feed on `/`.
- Integrate audio playback behavior with presence-aware policy.

### Phase 4: hardening

- Rate limits, validation hardening, and operational dashboards.

## Use cases

### 1) Peer leaves offline voice message

- User shares intercom-address.
- Peer sends audio while user is away.
- On return, message appears on `/`; playback follows away/present policy.

### 2) Agent response routed as audio notification

- Assist execution completes.
- Response is forwarded to user intercom-address.
- Ringer plays audio and `/` feed records the message.

### 3) Ad hoc conferencing-room invite

- User shares intercom-address with a small group.
- Participants connect/send coordinated text/audio/media.
- `/` page acts as the receiving surface tied to that address route.

### 4) Cross-occupant async communication

- Human or agent occupant sends message without requiring both parties active simultaneously.
- Intercom-address route preserves eventual delivery and visibility on `/`.

## Relationship to other docs

- [P2A implementation architecture](agent-play-p2a-implementation.md)
- [Assist tools as world background runtime](assist-tools-world-background-runtime.md)
- [Events, SSE, and remote API](events-sse-and-remote.md)
- [Agent-Human Intercom Architecture note](notes/agent-human-intercom.md)

## Summary

Intercom-address (`intercom-address://{channelKey}`) is the frontend-facing identity layer for P2A and Agent Ringer. It makes routing shareable, enables open inbound text/audio/media delivery, and anchors message visibility on `/` while preserving existing intercom/channel-key infrastructure.
