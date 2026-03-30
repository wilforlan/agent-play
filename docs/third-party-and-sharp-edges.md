# Third-party knowledge and sharp edges

These areas are where contributors most often need **external documentation** or careful debugging.

## LangChain (`@langchain/core` messages)

**Files:** the **SDK** (`packages/sdk`) exposes `langchainRegistration` and remote RPC helpers; the **web-ui** host stores whatever **`Journey`** and interaction lines you send.

- The host **does not** turn invoke output into journeys automatically. After `invoke`, map your **message sequence** (human, AI tool calls, tool results, final AI) into a **`Journey`** (`public-types` in the SDK) and call **`recordJourney`**.
- Useful LangChain familiarity: `tool_calls` on AI messages, tool result messages, and normalizing `content` when building step text.
- **Sharp edge:** Odd message ordering or multimodal `content` is your integration’s concern when building `Journey` steps and `recordInteraction` text.

## LangChain agents (`langchain` package)

**Files:** [`examples/*.ts`](../packages/sdk/examples/), registration via `langchainRegistration`.

- Examples use `createAgent`, `ChatOpenAI`, and Zod tool schemas — API surface follows LangChain v1 patterns.
- **Sharp edge:** Tool names in the agent must match what `layoutStructuresFromTools` expects; renaming tools changes structure ids/positions.

## Next.js app and SSE

**Files:** [`packages/web-ui/src/app/api/agent-play/events/route.ts`](../packages/web-ui/src/app/api/agent-play/events/route.ts).

- SSE uses `ReadableStream` and valid `sid` per request; when `REDIS_URL` is set, clients subscribe to Redis Pub/Sub fanout so all instances see the same events.
- **Sharp edge:** The watch UI expects `prebuild` to copy `play-ui` into `web-ui/src/canvas/vendor`; skipping the copy step yields a stale or missing bundle.

## Pixi.js v8

**Files:** [`packages/play-ui/src/`](../packages/play-ui/src/) — multiverse/canvas modules.

- Scene graph (`Container`, `Graphics`, `Text`), render loop (`ticker` / custom `onTick`/`onFrame`), coordinate systems (screen vs world).
- **Sharp edge:** World coordinates in the preview use a **grid** derived from `worldMap.bounds` and `cellScale`; agent positions are continuous floats — mapping is in `main.ts` (`worldToScreen`).
- **Sharp edge:** Destroying containers and textures on hot reload or theme changes must match Pixi lifecycle to avoid WebGL leaks.

## Browser: EventSource

**Files:** [`main.ts`](../packages/play-ui/src/main.ts) SSE connection.

- Reconnection behavior is browser-dependent; network drops may require page refresh in dev.
- **Sharp edge:** CORS and credentials if preview is on a different origin than the API.

## Markdown in UI

**Files:** chat-related modules; **marked** + **dompurify**.

- Untrusted model output should stay sanitized; changes to rendering pipeline affect XSS surface.

## World bounds and two runtimes

- Server: `play-world.ts` clamps enriched paths with `clampPathToBounds`.
- Browser: [`world-bounds.ts`](../packages/sdk/src/lib/world-bounds.ts) imported into play-ui for client-side clamping and joystick behavior.

**Sharp edge:** Logic drift between server and client if only one side is updated — keep shared math in `world-bounds.ts` and test both packages when changing bounds rules.

## Vitest (dual versions)

- `packages/sdk` and `packages/web-ui` use Vitest 3; `packages/play-ui` uses Vitest 4. Run tests **per workspace** (`npm run test -w @agent-play/sdk`, etc.).
