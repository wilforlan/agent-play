# Peer proximity voice call — implementation plan

**Status:** Billing milestone in progress — peer talk purchase path + random 7–15s ticks being implemented (LiveKit fallback already removed).  
**Locked product decisions:** proximity-gated 1:1 peer WebRTC audio; host signaling (geography pattern / TURN); sticky Accept/Decline invite; caller-only billing at **$0.002/s** with **random tick intervals in [7, 15] seconds inclusive**; HH:MM:SS UI; explicit H2H policy exception.  
**Prior research:** [Private proximity call design](2d767f83-56f6-4016-b466-d63630fd7d5a) (ctx subagent); product lock in parent session `94e70699-45cd-4415-8e24-13dc5903b679`.

---

## Goals / non-goals

### Goals (MVP)

- Near another **geography human** (main node id), the proximity pad **P** becomes **Talk** and starts a **private 1:1 voice call invite**.
- Callee gets a **sticky** tray notification + ringtone with **Accept** (green) / **Decline** (red) CTAs.
- Accept → dedicated peer **audio** `RTCPeerConnection` connects via host SDP/ICE.
- Decline → caller receives a **declined** notification.
- Either party **End** hangs up; UI shows elapsed time as **HH:MM:SS**.
- **Caller-only** wallet billing at **$0.002/s**, mirroring `talkSession*` ticks (new peer rate / purchase kind).
- Mutual exclusion with agent OpenAI Realtime PTT mic.
- Document explicit exception to current `__human__ → __human__` interaction ban.

### Non-goals (MVP)

- OpenAI Realtime rooms, LiveKit/Daily SFU (not MVP and not a deferred fallback), group calls, recording, transcription.
- Reusing the geography **data-channel** PC for audio (keep a separate call PC).
- Callee billing or callee APU rewards.
- Leave-proximity auto-hangup / renegotiate mid-call (optional later).
- Mute/block/report moderation tooling (note as follow-up).
- x402 / Solana settlement for peer talk (still Redis wallet).

---

## Architecture

### Sequence (invite → ring → accept/decline → media → hangup → bill)

```text
Caller (near human peer)                Host                              Callee
        |                                |                                  |
        | peerCallInvite RPC             |                                  |
        |------------------------------->| validate sid, wallet > 0,         |
        |                                | coarse proximity, mutual idle    |
        |                                | create call record (ringing)     |
        |                                | fanout peer_call_invite notif    |
        |                                |--------------------------------->|
        |                                |                                  | sticky tray + ringtone
        |                                |                                  |
        |                     Accept  OR Decline                            |
        |                                |<---------------------------------|
        |                                |                                  |
   [Decline path]                        |                                  |
        | peer_call_declined notif       |                                  |
        |<-------------------------------| clear call                       |
        |                                |                                  |
   [Accept path]                         |                                  |
        | peerCallAccept → status=active |                                  |
        | startPeerTalkSession (caller)  |                                  |
        | peerCallSignal offer/answer/ice (dedicated SSE event)             |
        |<------------------------------>|<-------------------------------->|
        | getUserMedia + audio PC        |                                  | getUserMedia + audio PC
        |                                |                                  |
        | every TALK_TICK_SECONDS: peerTalkSessionTick (caller wallet)      |
        |                                |                                  |
        | peerCallHangup / End           | final peerTalkSessionStop        |
        |------------------------------->| clear call + close media hint    |
```

### Component map (reuse vs new)

| Concern | Reuse | New / extend |
|---------|-------|--------------|
| Proximity radius | `DEFAULT_PROXIMITY_RADIUS` in `packages/play-ui/src/proximity-interaction.ts` | Include geography human ids in partner set (today agents-only via `registeredAgentPartnerForProximityOrNull` in `packages/play-ui/src/main.ts`) |
| Pad P relabel | `getAmenityItemActionLabel` / parking / game patterns in `packages/play-ui/src/preview-proximity-touch-controls.ts` | `getPeerTalkLabel` → `"Talk"` / `"End"`; precedence below amenity Buy/Enter, above idle Push |
| Invite UX | `packages/intercom/src/notifications.ts`, tray `packages/play-ui/src/notification-tray.ts`, intake `packages/play-ui/src/notification-intake.ts` | New kinds `peer_call_invite` / `peer_call_declined`; sticky + Accept/Decline actions |
| Ringtone | `packages/play-ui/src/preview-ringer-engine.ts` | Loop ringtone while invite open (today one-shot 6s when tab not present) |
| Signaling | Pattern from `POST /api/agent-play/geography/signal` + `WORLD_GEOGRAPHY_SIGNAL_EVENT` | **Separate** call signal route/event so pose mesh PCs stay untouched |
| Media | ICE/TURN env `VITE_GEOGRAPHY_TURN_*` in `packages/play-ui/src/geography-mesh-session.ts` | New `peer-voice-session.ts` with **audio-only** `RTCPeerConnection` |
| Billing | `talkSessionStart/Tick/Stop` in `packages/web-ui/src/server/agent-play/redis-session-store.ts` + RPC cases in `packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts` | Parallel `peerTalkSession*` + `PEER_TALK_PRICE_PER_SECOND_USD = 0.002` |
| Policy | `PlayWorld.recordProximityAction` H2H throw in `packages/web-ui/src/server/agent-play/play-world.ts` | Do **not** route peer calls through `recordProximityAction`; document exception in occupant docs |

### Identity rules

- Wallet / billing / call parties use **credentialed main node ids** (same as talk billing: not `__human__` pawn id). See `docs/payments-wallets-and-talk-billing.md` and `getMainNodeIdForIntercom()` / `getViewerWalletPlayerId()` in play-ui.
- Geography membership already keys humans by `humanId` (main node id) — `packages/geography-mesh/src/schemas.ts` `GeographyMemberSchema`.
- Local id: `getLocalGeographyHumanId()` in `packages/play-ui/src/main.ts`.

### Proximity gate (server-authoritative)

On `peerCallInvite`:

1. Both `callerId` and `calleeId` must be geography members for this `sid` (`store.getGeographyMembers()` — same membership used by `packages/web-ui/src/app/api/agent-play/geography/signal/route.ts`).
2. Compute Euclidean distance from stored coarse `{x,y}` on members; require `d <= DEFAULT_PROXIMITY_RADIUS` (export shared constant from SDK or geography-mesh; do not hardcode a second radius).
3. Reject if either party already has an active/ringing call.
4. Reject if caller wallet `balanceUsd <= 0` (mirror `startTalkSession`).

Client proximity only enables the Talk button; it is not trust for invite.

### Media mutual exclusion

- If agent PTT Realtime is active (`preview-session-interaction-panel.ts`), refuse peer call start / accept with clear UI error; stop PTT before accepting peer call (or reject accept until PTT ends).
- While peer call active: disable pad Push-to-talk path and `preparePushToTalkConnection`.
- Never attach audio tracks to the geography Yjs data-channel PC (`createDataChannel("geography-yjs")` in `geography-mesh-session.ts`).

---

## Data model + API / RPC / SSE surface

### Redis keys (proposed)

| Key | Purpose |
|-----|---------|
| `agent-play:{hostId}:peer-call:{callId}` | Call record JSON (status, parties, timestamps) |
| `agent-play:{hostId}:peer-call-by-human:{humanId}` | Active/ringing `callId` for mutual exclusion (optional secondary index) |
| `agent-play:{hostId}:peer-talk:{callerNodeId}:{calleeNodeId}` | Billing session (mirror `agent-play:{hostId}:talk:{viewerNodeId}:{agentId}` from `talkSessionKey` in `redis-session-store.ts`) |

TTL: ringing invites ~45–60s; active calls refreshed on tick or hangup delete.

### Call record (schema-first, Zod in SDK or intercom)

```ts
// Conceptual — implement as Zod in packages/sdk (or packages/intercom) then infer types
PeerCallStatus = "ringing" | "active" | "ended" | "declined" | "missed" | "failed"
PeerCallRecord = {
  callId: string
  sid: string
  callerId: string      // main node id
  calleeId: string
  status: PeerCallStatus
  createdAt: string     // ISO
  answeredAt?: string
  endedAt?: string
  endReason?: "hangup" | "decline" | "timeout" | "insufficient_funds" | "error"
}
```

### Notification kinds (`packages/intercom/src/notifications.ts`)

Extend `WorldNotificationKindSchema`:

- `peer_call_invite` — sticky; metadata `{ callId, callerId, callerDisplayName }`
- `peer_call_declined` — auto-dismiss OK; metadata `{ callId, calleeId }`
- (optional MVP+) `peer_call_ended`, `peer_call_missed`

Builders: `buildPeerCallInviteNotification`, `buildPeerCallDeclinedNotification`.  
Delivery still via `buildNotificationIntercomEvent` → `WORLD_NOTIFICATION_CHANNEL` / `world:intercom` SSE (`packages/web-ui/src/server/agent-play/intercom/fanout.ts`).

Update `shouldDeliverWorldNotification` so invite targets **callee only**; declined targets **caller only**.

### RPC ops (`POST /api/agent-play/sdk/rpc`, `packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts`)

| Op | Payload | Behavior |
|----|---------|----------|
| `peerCallInvite` | `{ callerId, calleeId }` | Proximity + idle + funds checks; create ringing call; fanout invite notif |
| `peerCallAccept` | `{ callId, calleeId }` | ringing→active; start peer talk billing for caller; fanout accepted (or dedicated SSE) |
| `peerCallDecline` | `{ callId, calleeId }` | ringing→declined; notify caller; clear indexes |
| `peerCallHangup` | `{ callId, actorId }` | active→ended; `peerTalkSessionStop`; notify peer; clear |
| `peerTalkSessionStart` | `{ callerId, calleeId, callId }` | NX session; return rate `0.002` |
| `peerTalkSessionTick` | `{ callerId, calleeId, callId }` | CAS debit caller wallet; append purchase |
| `peerTalkSessionStop` | `{ callerId, calleeId, callId }` | Final bill + delete session |

Prefer starting billing on **Accept** (not Invite) so declined rings are free.

### HTTP signaling (mirror geography)

New routes (do not overload geography signal payload kinds):

- `POST /api/agent-play/peer-call/signal?sid=` — body like `GeographySignalBody` plus `callId`:
  - `{ callId, fromHumanId, toHumanId, kind: "offer"|"answer"|"ice", payload }`
- Validate: both parties members of `callId`, status `active` (or ringing only for early ICE if needed — prefer signal only after accept).

SSE event constant, e.g. `WORLD_PEER_CALL_SIGNAL_EVENT = "world:peer-call-signal"` (parallel to `WORLD_GEOGRAPHY_SIGNAL_EVENT` in `packages/geography-mesh/src/constants.ts`).

Optional: `world:peer-call-state` fanout for status transitions if clients need more than notifications.

### SessionStore contract

Extend `packages/web-ui/src/server/agent-play/session-store.ts` + Redis impl + `session-store.test-double.ts`:

- `createPeerCall` / `getPeerCall` / `transitionPeerCall` / `clearPeerCall`
- `startPeerTalkSession` / `tickPeerTalkSession` / `stopPeerTalkSession`

Mirror WATCH/MULTI patterns from `startTalkSession` / `tickTalkSession` / `stopTalkSession` in `redis-session-store.ts` — **without** agent PU reward path.

---

## Client UI changes

### Proximity pad (`packages/play-ui/src/preview-proximity-touch-controls.ts` + `main.ts`)

1. Track nearest **human** partner from geography poses in `playerWorldPos` (ids from mesh / presence), excluding self.
2. Precedence for P label (highest first): amenity item Buy/View → amenity Enter → parking → game stage → house inspect → **peer Talk** → agent Push.
3. Near human + idle: `P` = **Talk**; `onPushToTalk` branches to `startPeerCall(partnerId)` instead of agent PTT.
4. In-call: `P` = **End** (or dedicated End control) + disable agent PTT.
5. Legend copy updates when near human: “P: talk” vs agent “P: push to talk”.

### Notification tray (`packages/play-ui/src/notification-tray.ts`)

- Support sticky items (`sticky: true` or kind-based): **no** `NOTIFICATION_TRAY_AUTO_DISMISS_MS` timer for `peer_call_invite`.
- Action row: Accept (green icon/button) / Decline (red).
- Callbacks: `onAccept(notification)`, `onDecline(notification)`.
- Wire from `notification-intake.ts` / `main.ts` SSE `world:intercom` path (same intake as likes/replies).

### Ringer (`packages/play-ui/src/preview-ringer-engine.ts`)

- Add `startIncomingCallRing` / `stopIncomingCallRing` that loops `playRingtone` until stop.
- Start on invite delivery; stop on accept/decline/timeout/hangup.

### Call HUD (new small module, e.g. `packages/play-ui/src/peer-call-hud.ts`)

- Above proximity pad: peer display name + **HH:MM:SS** (format from elapsed whole seconds; pure helper `formatCallDurationHhMmSs(seconds)` in SDK or play-ui).
- End button if not solely on pad.
- Start timer UI on accept (client clock); reconcile with `secondsBilledTotal` from ticks optionally.

### Peer voice session (new `packages/play-ui/src/peer-voice-session.ts`)

- Dedicated `RTCPeerConnection` with `getUserMedia({ audio: true, video: false })`.
- Reuse `defaultIceServers()` / TURN env from geography mesh.
- Send/receive signals via new peer-call signal API + SSE.
- Perfect negotiation optional; MVP can use caller-as-offerer after accept.
- Cleanup tracks on hangup / page hide (`beforeunload` → hangup RPC best-effort).

### Agent PTT unchanged

Agent near → still Push → OpenAI Realtime in `preview-session-interaction-panel.ts` + `talkSession*` at `$0.025/s`.

Vendored copies under `packages/web-ui/src/canvas/vendor/` must stay in sync with play-ui (existing monorepo sync practice).

---

## Billing changes

### Constants (`packages/sdk/src/lib/talk-billing.ts` or sibling `peer-talk-billing.ts`)

Prefer a sibling file to avoid muddying agent Realtime math:

```ts
PEER_TALK_PRICE_PER_SECOND_USD = 0.002
PEER_TALK_PRICE_PER_60S_USD = 0.12
PEER_TALK_TICK_MIN_SECONDS = 7
PEER_TALK_TICK_MAX_SECONDS = 15
nextPeerTalkTickSeconds(random?) => integer in [7, 15]
peerCostForSeconds(seconds) => Math.round(Math.floor(seconds) * 2) / 1000
```

Client billing loop should schedule the next `peerTalkSessionTick` with `nextPeerTalkTickSeconds() * 1000` (not a fixed 10s agent tick).

Export from `packages/sdk/src/index.ts` and `packages/sdk/src/browser.ts`.

### Purchase audit (`PurchaseRecordSchema` in `packages/sdk/src/lib/space-content-model.ts`)

- Add amenityKind `"peer_talk_time"`.
- Add itemRef.kind `"peer_talk"` (or reuse `"talk"` with id `"peer-webrtc"` — prefer distinct kind for inventory chips).
- Sentinel `spaceId: "__peer_talk__"`.
- Detail like `Peer voice · Ns · callee {id}`.

### Wallet ticks

- Caller only; no agent PU credit.
- Same INSUFFICIENT_FUNDS behavior: clear billing session + force hangup on both clients.
- Liability: ~1 tick × $0.002/s ≈ **$0.02** orphan (much smaller than agent talk’s ~$0.25).

### Client billing loop

Mirror `beginTalkBilling` / `runTalkBillingTick` / `stopTalkBilling` in `preview-session-interaction-panel.ts`, but in peer-call controller:

- Start after accept (caller only).
- Interval via `nextPeerTalkTickSeconds()` → delay in **[7, 15]s** (inclusive), not agent `TALK_TICK_SECONDS`.
- Update wallet HUD from tick response.

### Docs

Update `docs/payments-wallets-and-talk-billing.md` with a **Peer proximity voice** section (rate, keys, RPCs, no PU).

### Analytics (optional MVP)

Extend `ANALYTICS_EVENT_NAMES` in `packages/sdk/src/lib/analytics-event-model.ts`: `peerCallInvited`, `peerCallAnswered`, `peerCallDeclined`, `peerCallEnded`, `peerTalkSessionBilled`.

---

## Policy / docs updates

Files to update (explicit exception language):

1. `docs/notes/occupant-model-and-interaction-policy.md` — allow **opt-in proximity peer voice** (Accept required); keep chat/assist/text H2H disallowed.
2. `docs/occupant-model-v1.md` — same exception under Interaction policy.
3. `docs/notes/yjs-world-geography-multiplayer.md` — note peer voice uses separate PC + signal event; geography mesh remains pose-only.
4. `docs/payments-wallets-and-talk-billing.md` — peer rate + purchase kind.
5. `docs/README.md` / `docs/multiplayer.md` — short pointer if present.
6. `docs/geography-mesh.md` — clarify TURN may be shared; signaling channels must not mix.

**Code policy:** Do **not** weaken `recordProximityAction` H2H ban for assist/chat/PTT. Peer calls go through `peerCall*` APIs only. Keep `play-world-proximity-policy.test.ts` green for chat H2H.

---

## Test plan (behavior / TDD order)

Repo culture: **failing test first**, minimal green, refactor. Prefer behavior tests through public APIs/schemas.

### Milestone 0 — schemas & pure helpers

| Order | Failing test first | Then implement |
|-------|--------------------|----------------|
| 0.1 | `packages/sdk/src/lib/peer-talk-billing.test.ts` — `$0.002/s`, 60s → `$0.12`, flooring, non-finite → 0 | `peer-talk-billing.ts` |
| 0.2 | `packages/play-ui/src/format-call-duration.test.ts` — `0 → 00:00:00`, `3661 → 01:01:01` | `format-call-duration.ts` |
| 0.3 | `packages/intercom/src/notifications.test.ts` — parse invite/declined kinds; delivery targeting | extend `notifications.ts` |
| 0.4 | `PurchaseRecordSchema` accepts `peer_talk_time` | extend `space-content-model.ts` |

### Milestone 1 — server call lifecycle (no media)

| Order | Failing test first | Then implement |
|-------|--------------------|----------------|
| 1.1 | Session store: invite creates ringing; second invite while busy fails | Redis + test-double methods |
| 1.2 | Invite rejected when coarse distance > radius | proximity check using members map |
| 1.3 | Decline → status declined + caller notification payload | transition + fanout builder |
| 1.4 | Accept → active; hangup → ended | transitions |
| 1.5 | RPC route tests for ops + bad payload / wrong party | `sdk/rpc/route` cases |

### Milestone 2 — billing

| Order | Failing test first | Then implement |
|-------|--------------------|----------------|
| 2.1 | `startPeerTalkSession` NX / INSUFFICIENT_FUNDS | store method |
| 2.2 | tick debits caller only at peer rate; purchase row `peer_talk_time` | tick path |
| 2.3 | stop finalizes; insufficient funds clears session | stop / funds path |
| 2.4 | Accept starts billing; Decline does not | integration via store |

### Milestone 3 — tray + ringer UI

| Order | Failing test first | Then implement |
|-------|--------------------|----------------|
| 3.1 | Sticky invite does not auto-dismiss | `notification-tray.test.ts` |
| 3.2 | Accept/Decline buttons fire callbacks | tray actions |
| 3.3 | Intake delivers invite to callee only | `notification-intake.test.ts` |
| 3.4 | Ringer start/stop loop | `preview-ringer-engine.test.ts` |

### Milestone 4 — pad + proximity UX

| Order | Failing test first | Then implement |
|-------|--------------------|----------------|
| 4.1 | Near human → P label Talk; amenity still wins | `preview-proximity-touch-controls.test.ts` |
| 4.2 | In-call → End label | same |
| 4.3 | Pure helper: nearest human partner selection among positions | proximity-interaction or new helper test |

### Milestone 5 — signaling + voice session (unit / fake PC)

| Order | Failing test first | Then implement |
|-------|--------------------|----------------|
| 5.1 | Signal route rejects non-members / wrong callId | route test |
| 5.2 | Peer voice session posts offer and handles answer (mock RTCPeerConnection) | `peer-voice-session.test.ts` |
| 5.3 | Hangup stops tracks and clears PC | same |

### Milestone 6 — policy docs + regression

| Order | Failing test first | Then implement |
|-------|--------------------|----------------|
| 6.1 | Keep `play-world-proximity-policy.test.ts` H2H chat ban | docs-only exception; no production weaken of chat |
| 6.2 | Optional: peerCallInvite allowed when members close (store test already covers) | — |

Manual / smoke (after automated green): two browsers, TURN on, accept path, decline path, insufficient funds mid-call, PTT exclusion.

---

## Phased milestones (shippable increments)

### M1 — Billing constants + purchase schema (no UX)

- Peer rate helpers + schema enum.
- **Tests first:** 0.1, 0.4.
- Ship: SDK exports usable by server/client.

### M2 — Server invite / accept / decline / hangup + notifications

- Redis call records, RPCs, intercom kinds, fanout.
- Coarse proximity gate.
- **Tests first:** 0.3, 1.x.
- Ship: API-complete ringing lifecycle without media (clients can show invite UI against stubs).

### M3 — Sticky tray + ringtone + pad Talk label

- Tray sticky + CTAs; ringer loop; pad Talk when near human.
- Wire invite/decline RPCs (accept can still no-op media).
- **Tests first:** 3.x, 4.x.
- Ship: full social invite UX; Accept creates active call record only.

### M4 — Peer talk wallet ticks

- `peerTalkSession*` store + RPC + caller client interval on accept.
- HUD balance updates; funds hangup.
- **Tests first:** 2.x.
- Ship: billable calls even if audio is stubbed.

### M5 — Dedicated audio WebRTC + signal route

- `peer-voice-session.ts`, signal HTTP + SSE, TURN reuse, End + HH:MM:SS HUD.
- Mic exclusion vs agent PTT.
- **Tests first:** 5.x + duration helper 0.2.
- Ship: **MVP complete**.

### M6 — Docs / policy exception + polish

- Occupant policy exception, payments docs, geography-mesh note.
- Analytics events if not earlier.
- **Tests first:** 6.1 regression; doc review via behavior unchanged for H2H chat.

---

## File checklist (concrete touch list)

| Area | Paths |
|------|-------|
| Billing | `packages/sdk/src/lib/peer-talk-billing.ts`, `talk-billing.ts` (reuse tick seconds), `space-content-model.ts`, `browser.ts`, `index.ts` |
| Intercom | `packages/intercom/src/notifications.ts`, `notifications.test.ts`, `index.ts` |
| Store | `packages/web-ui/src/server/agent-play/session-store.ts`, `redis-session-store.ts`, `session-store.test-double.ts` |
| RPC | `packages/web-ui/src/app/api/agent-play/sdk/rpc/route.ts` (+ tests if present) |
| Signal | `packages/web-ui/src/app/api/agent-play/peer-call/signal/route.ts` (new), fanout helper beside `geography-membership.ts` |
| UI | `packages/play-ui/src/preview-proximity-touch-controls.ts`, `main.ts`, `notification-tray.ts`, `notification-intake.ts`, `preview-ringer-engine.ts`, new `peer-voice-session.ts`, `peer-call-hud.ts`, `format-call-duration.ts` |
| Vendor sync | `packages/web-ui/src/canvas/vendor/*` mirrors |
| Docs | `docs/notes/occupant-model-and-interaction-policy.md`, `docs/occupant-model-v1.md`, `docs/payments-wallets-and-talk-billing.md`, `docs/geography-mesh.md`, `docs/notes/yjs-world-geography-multiplayer.md` |

---

## Risks + open questions (blocking only)

### Risks (handle in MVP design)

1. **NAT / TURN** — Without TURN, audio fails like mesh pose links. Reuse `VITE_GEOGRAPHY_TURN_*` early; fail invite accept with visible error if ICE fails.
2. **Mic contention** — Geography PC + peer audio PC + OpenAI Realtime: enforce hard mutual exclusion with agent PTT.
3. **Proximity spoofing** — Client pad is UX only; invite must check server coarse positions.
4. **Harassment** — Opt-in Accept is required; mute/block deferred but policy docs must state exception scope narrowly.
5. **Tray gap** — Auto-dismiss today (`NOTIFICATION_TRAY_AUTO_DISMISS_MS = 10_000`) will kill rings unless sticky is implemented before shipping invite UX.

### Open questions (only if blocking)

1. **Invite timeout** — Recommend **45s** missed → `missed` + clear; confirm product preference before M2 ships.
2. **Must parties stay in proximity during call?** — Recommend **no** for MVP (call continues until End) to avoid flaky hangups from coarse AOI jitter; confirm.
3. **Caller-as-offerer only?** — Recommend yes for MVP (simpler than perfect negotiation); confirm if callee-initiated renegotiation needed for mobile Safari quirks.

Non-blocking later: callee PU, leave-proximity policy, x402 settlement, report/block.

---

## Verdict

Implement as **six milestones**, each starting with failing behavior tests: schema/rate → server invite lifecycle → sticky Accept/Decline UX → caller `$0.002/s` ticks → dedicated peer audio WebRTC + TURN signaling → policy/docs exception. Do **not** reuse OpenAI Realtime or the geography data-channel PC for MVP voice.
