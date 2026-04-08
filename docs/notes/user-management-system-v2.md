# User management system v2 (target specification)

This note defines the **v2 target** for user management. It extends the current password-based runtime registration model with node identity, generated recovery credentials, and a Merkle-structure change tied to identity hierarchy.

This is a design and implementation contract for future work. If behavior in code differs today, this note is the target.

## v2 goals

1. Remove user email dependency from authentication and identity.
2. Use a generated recovery credential (not user-chosen password).
3. Introduce a stable **node id** as the primary account identity.
4. Make all agents subordinate to that node id.
5. Reflect node ownership in world/chain registration and Merkle shape.

## Core changes from current system

### 1) Generated credential replaces user-set password

- Users no longer set a custom password.
- The platform generates a **10-word phrase**.
- This phrase is the user’s primary recovery/auth credential.
- User must be warned clearly:
  - keep it safe,
  - if lost, access to all agents under that node is lost.

### 1.1) Node id derivation must match play-tools root-node method

- The generated file must derive into the **same node id method** used for the root node flow in your play-tools stack.
- Reference source of truth: `/Users/williamsisaac/Documents/play-tools/node-validation.md`.
- The derivation and validation algorithm must be ported into the main codebase so server/CLI/SDK do not depend on external scripts at runtime.
- v2 requires deterministic derivation parity:
  - same domain label behavior,
  - same salt strategy,
  - same KDF parameters,
  - same output encoding/normalization rules.

If derivation parity is broken, authentication and node ownership checks are invalid by definition.

### 2) CLI command to generate identity credential

- CLI adds a command to generate identity material (example naming: `agent-play init-node` or `agent-play generate-password`).
- Command output must include:
  - generated 10-word reversible phrase,
  - generated node id.
- Command writes credential payload to a local file.
- File path must be emitted and reused by SDK configuration.

#### Required CLI output contract

After command execution, CLI must print:

1. `nodeId` (primary platform identity)
2. generated 10-word phrase
3. absolute file path where credential content is written

The phrase display is one-time sensitive output. The warning must state that phrase loss means losing access to all agents tied to this node.

### 3) Remove email requirement

- No email lookup/register/login flow in v2.
- Account identity is anchored to node id + generated phrase.
- All account and runtime checks are keyed by node id.

### 4) Node-centric agent ownership

- Each user has one primary **node id**.
- Every registered agent is attached to that node id.
- Ownership checks become:
  - credential -> node id
  - agent.nodeId must equal authenticated node id.

### 4.1) Authentication tuples (strict)

v2 authentication requirements are explicit:

- **Main node activities** require:
  - `nodeId`
  - `passw` (10-word phrase material or validated equivalent)

- **Agent node admin activities** require:
  - `mainNodeId`
  - `passw`
  - `agentNodeId`

Validation order for agent admin actions must be:

1. validate `mainNodeId` + `passw`
2. load `agentNodeId`
3. assert `agent.nodeId === mainNodeId`
4. authorize action

No agent admin mutation is valid if any of these checks fail.

### 5) Merkle tree shape update (mandatory invariant)

- Merkle representation must encode node ownership above/with agent leaves.
- This is a strict rule and must not be optional.
- Agent registration and chain stable-key logic must enforce node hierarchy consistently.

## Definitive v2 flow (all steps)

## A) Node bootstrap

1. User runs CLI identity command.
2. CLI generates:
   - node id
   - 10-word reversible phrase
3. CLI persists credential file locally.
4. CLI prints warning and storage path.

5. System derives `nodeId` from generated file content using the same root-node derivation method documented in play-tools.
6. System validates derivation using in-repo validation code (ported from play-tools `node-validation.md` path logic).

Required warning text semantics:

- this phrase is required for access,
- if lost, user loses access to all agents under this node.

## B) SDK initialization

1. SDK accepts credential file path (or loaded content) as auth source.
2. SDK resolves node identity from that content using the same derivation implementation as server-side validators.
3. SDK validates derived `nodeId` before performing authenticated node activities.
4. SDK sends node-based auth material on registration/mutation calls.

## C) Agent registration under node

1. Client requests agent creation/registration with node-auth context.
2. Server validates node credential.
3. Server stores `agentId` under `nodeId`.
4. Registration to world requires authenticated node ownership.

5. Stored agent record must persist `nodeId` as mandatory ownership field.

## D) Runtime addPlayer / occupancy registration

1. Caller submits `agentId` with node-auth context.
2. Server loads agent record.
3. Server checks `agent.nodeId === auth.nodeId`.
4. On success, occupant is inserted and fanout emitted.
5. Player-chain notify + node fetch converge clients.

## E) Recovery semantics

- Phrase loss means no recovery path unless additional recovery channels are introduced explicitly.
- v2 default assumes no implicit admin backdoor.

## Data model v2 (target)

At minimum, records must include:

- **Node record**
  - `nodeId`
  - phrase verification material (stored hash/derived form, never plaintext)
  - derivation metadata/version to guarantee play-tools parity over time
  - `createdAt`, `updatedAt`

- **Agent record**
  - `agentId`
  - `nodeId` (required)
  - name, tool metadata, counters, timestamps

- **Credential file (local)**
  - source content used for deterministic node derivation
  - optional persisted `nodeId` cache (must be re-derivable and re-validatable)
  - phrase payload (or encrypted/encoded representation, depending on local policy)
  - optional metadata/version

## Merkle and stable-key implications (mandatory)

v2 requires identity hierarchy to be reflected in chain structure.

Minimum constraints:

1. Stable keys must be node-aware for agent leaves and map to node ownership hierarchy.
2. Registration/mutation logic must preserve deterministic ordering under node ownership.
3. Client merge path must remain deterministic with the new key format.
4. Fanout `playerChainNotify` still transports references only; node fetch remains the source of full row state.

5. Node anchor semantics and node validation logic must be consistent with the derivation/validation method ported from play-tools.

Recommended direction:

- move from flat `agent:{agentId}` semantics to node-qualified keys, for example:
  - `node:{nodeId}`
  - `agent:{nodeId}:{agentId}` or equivalent canonical shape.

Exact format can vary, but the hierarchy requirement cannot.

### 5.1) Required validation code port

The code path documented in `/Users/williamsisaac/Documents/play-tools/node-validation.md` must be rewritten into the main codebase for:

- CLI credential generation validation
- server-side node auth validation
- SDK-side local identity resolution checks

The implementation must expose shared primitives so all three layers use identical verification behavior.

## Security posture and risks in v2

### Required controls

1. Phrase must be generated with strong entropy.
2. Phrase verification must use a slow hash (scrypt/argon2/bcrypt class).
3. No plaintext phrase persistence server-side.
4. CLI file permissions must be restrictive by default.
5. Node-auth checks must be centralized, not duplicated ad hoc.
6. Node derivation/validation mismatch between CLI/SDK/server must be treated as a critical security defect.

### Known risks to mitigate

1. **Single-factor loss risk**
   - Losing phrase means account/agent loss.
   - This is intentional in v2 unless recovery mechanisms are explicitly designed.

2. **Local compromise risk**
   - If local credential file is stolen, attacker can impersonate node.

3. **Operator ambiguity**
   - Without email identity, support and recovery process must be clearly defined.

4. **Derivation drift risk**
   - If play-tools method and main codebase method diverge, valid users can be locked out or invalid identities could be accepted.
   - This requires strict test vectors and versioned derivation metadata.

## Developer implementation checklist

1. Remove email-based auth routes and references.
2. Introduce node bootstrap command in CLI.
3. Add SDK support for credential file path loading.
4. Port node derivation/validation logic from play-tools (`node-validation.md`) into shared main-code utilities.
5. Replace userId ownership checks with nodeId checks.
6. Update repository schema and migration path to include nodeId.
7. Update addPlayer/auth pathways to validate node ownership and enforce auth tuples.
8. Update player-chain stable-key logic to include node hierarchy.
9. Add tests for:
   - bootstrap and credential loading,
   - derivation parity with play-tools vectors,
   - ownership rejection across node boundaries,
   - chain diff/notify correctness after key-shape change.

## Compatibility and rollout notes

- v2 is a breaking identity change.
- Existing email/password and API-key-era assumptions should be treated as legacy mode.
- Migration strategy must define:
  - how existing users get node ids,
  - how existing agents are attached to nodes,
  - how chain keys are re-derived during transition.

