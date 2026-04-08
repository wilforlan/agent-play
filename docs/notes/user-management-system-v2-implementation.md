# User management system v2 — implementation direction

This file translates `user-management-system-v2.md` into an implementation plan for coding assistants and contributors.

Use this as an execution guide: what to build, where to build it, in what order, and how to validate completion.

## Scope and non-scope

## In scope

- Node-first identity (`nodeId`) with generated 10-word phrase (`passw`) flow.
- Removal of email-required auth paths from primary user workflow.
- Shared node derivation/validation implementation in main codebase (CLI + SDK + server).
- Node-owned agent records and runtime ownership checks.
- Merkle/stable-key shape updates to encode node hierarchy.

## Out of scope (for initial v2 cut)

- Legacy-mode dual auth support unless explicitly requested.
- New social/reputation/payment features not required by identity migration.
- New UI polish beyond required auth/flow changes.

## Primary references

- Product/contract note: `docs/notes/user-management-system-v2.md`
- Derivation/validation behavior source: `/Users/williamsisaac/Documents/play-tools/node-validation.md`
- Occupancy policy context: `docs/notes/occupant-model-and-interaction-policy.md`

## Guiding implementation rules

1. One shared node-crypto implementation must be used by CLI, SDK, and server.
2. No plaintext persistence of phrase material on server.
3. All privileged agent-node actions must require `mainNodeId + passw + agentNodeId`.
4. Merkle identity hierarchy changes are required, not optional.
5. Backward-incompatible changes must be explicit in docs and tests.

## Target module map

## New shared modules (recommended)

- `packages/sdk/src/lib/node-identity.ts` (or shared internal package)
  - Derive node id from credential material using v2-compatible method.
  - Validate node id against source material.
  - Expose stable API for CLI/SDK/server.

- `packages/web-ui/src/server/node-identity.ts`
  - Server-side wrappers around the same derivation/validation primitives.
  - Phrase verification helper (slow hash verification).

## Server changes

- `packages/web-ui/src/server/auth-store.ts`
  - Remove email-keyed flows from primary auth path.
  - Add node record creation/loading helpers.
  - Add phrase verification by `nodeId`.

- `packages/web-ui/src/server/agent-play/agent-repository.ts`
  - Replace/augment `userId` ownership with required `nodeId`.
  - Update record types and methods accordingly.

- `packages/web-ui/src/server/agent-play/redis-agent-repository.ts`
  - Redis schema migration to node-owned records.
  - Ensure lookup/indexing by node where needed.

- `packages/web-ui/src/server/agent-play/in-memory-agent-repository.ts`
  - Keep behavior parity with Redis repository for tests.

- `packages/web-ui/src/server/agent-play/play-world.ts`
  - `addPlayer` ownership check: agent must belong to authenticated main node.
  - Agent-node admin actions require tuple checks when applicable.

- `packages/web-ui/src/app/api/*`
  - Replace email-era auth endpoints with node bootstrap/auth endpoints.
  - Update `players` registration payload requirements.
  - Ensure route-level tuple validation for admin operations.

## SDK changes

- `packages/sdk/src/lib/remote-play-world.ts`
  - Support credential-file path or loaded node-auth object.
  - Send node-auth payload shape required by server.

- `packages/sdk/src/public-types.ts`
  - Replace/add auth-relevant public types with node-first semantics.

- `packages/sdk/examples/*`
  - Replace API-key/email assumptions with node-passw + nodeId flow.

## CLI changes

- `packages/cli/src/cli.ts`
  - Add command to generate node identity material:
    - 10-word phrase
    - derived node id
    - print credential file content (view once only with warnings that loosing this means looseing access to their node and all their agent nodes)
    - tell them to keep this safe in a file and this can be used to login and recover their account later
  - Remove old email/API-key command UX from default path.

## Player-chain / Merkle changes

- `packages/web-ui/src/server/agent-play/player-chain/index.ts`
  - Update stable key derivation to include node hierarchy (for agent leaves).
  - Keep deterministic ordering and notify behavior.

- `packages/sdk/src/lib/player-chain-merge.ts`
  - Keep parse/merge compatibility with new stable key shape.

- `packages/web-ui/src/server/agent-play/read-player-chain-node.ts`
  - Ensure node-scoped key lookup works for incremental sync fetches.

## Recommended rollout sequence

1. Implement shared node derivation/validation module with test vectors.
2. Add CLI node bootstrap command and local credential file schema.
3. Add server node records + phrase verification paths.
4. Migrate repository ownership from `userId` to `nodeId`.
5. Update API routes for node-first auth payloads.
6. Update SDK auth inputs and runtime registration payload.
7. Update player-chain key shape for node hierarchy.
8. Update docs and examples.
9. Run migration tests and end-to-end sync verification.

Do not merge partial ownership migrations without full route and runtime checks.

## Data migration strategy

## Required migration outputs

- Existing account records mapped to `nodeId`.
- Existing agents assigned to `nodeId`.
- Any legacy lookup keys updated or dual-read during migration window.
- Run `npm run migrate:v2:node-auth` against Redis before enabling strict route checks.

## Suggested migration phases

1. **Prepare**
   - Add new fields/keys and dual-write.
2. **Backfill**
   - Populate node ids for existing users and agent records.
3. **Cutover**
   - Switch read/auth ownership checks to `nodeId`.
4. **Cleanup**
   - Remove email-era/legacy ownership paths.

## Test plan (must-have)

## Unit tests

- Node id derivation deterministic parity against play-tools vectors.
- Phrase verification success/failure cases.
- Repository ownership checks by `nodeId`.
- Stable key generation under node-qualified shape.

## Integration tests

- CLI bootstrap -> file write -> SDK load -> addPlayer success.
- Wrong phrase, right node id -> denied.
- Right phrase, wrong agent node -> denied.
- Correct main node + passw + agent node -> allowed.

## Sync tests

- Merkle root changes when node-scoped ownership changes.
- `playerChainNotify` refs remain valid and merge converges for all clients.
- SDK and web-ui both converge from same fanout stream.

## Security tests

- No plaintext phrase appears in server persistence.
- Timing-safe phrase verification path (where applicable).
- Route-level checks reject incomplete auth tuple payloads.

## Acceptance criteria

Implementation is complete only when all are true:

1. Users can bootstrap with generated 10-word phrase and receive `nodeId`.
2. SDK/CLI/server share the same node derivation+validation behavior.
3. Email is not required for v2 primary flow.
4. Agent ownership is enforced by `nodeId`.
5. Merkle/player-chain shape reflects node hierarchy.
6. Full workspace tests pass and docs reference v2 flow.

## Coding-assistant execution notes

- Prefer small, test-first slices.
- Keep compatibility decisions explicit in code and docs.
- Update tests before changing behavior where possible.
- If migration risk is high, gate with feature flag and document default.

