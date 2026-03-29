# Third-party knowledge and sharp edges

These areas are where contributors most often need **external documentation** or careful debugging.

## LangChain (`@langchain/core` messages)

**Files:** [`journey-from-messages.ts`](../play-sdk/src/lib/journey-from-messages.ts), [`platforms/langchain.ts`](../play-sdk/src/platforms/langchain.ts), parts of [`play-world.ts`](../play-sdk/src/lib/play-world.ts).

- Journeys are **not** generic JSON; they are inferred from **message sequences** after `invoke`: `HumanMessage` / `AIMessage` / tool calls / tool results.
- You need familiarity with:
  - `isAIMessage`, `isToolMessage`, `isHumanMessage`, `isBaseMessage`
  - Tool call shape (`tool_calls` on AI messages) and tool result pairing
- **Sharp edge:** Multimodal or array `content` on messages is normalized to strings in several places; exotic content types may need explicit handling.
- **Sharp edge:** If the model returns unexpected message ordering, path extraction may produce empty or partial journeys — use `AGENT_PLAY_DEBUG=1` to trace.

## LangChain agents (`langchain` package)

**Files:** [`examples/*.ts`](../packages/sdk/examples/), registration via `langchainRegistration`.

- Examples use `createAgent`, `ChatOpenAI`, and Zod tool schemas — API surface follows LangChain v1 patterns.
- **Sharp edge:** Tool names in the agent must match what `layoutStructuresFromTools` expects; renaming tools changes structure ids/positions.

## Express and SSE

**Files:** [`mount-express-preview.ts`](../play-sdk/src/preview/mount-express-preview.ts).

- Peer dependency: `express` ^4 or ^5.
- SSE requires correct headers, no buffering middleware on the events route, and valid `sid` per request.
- **Sharp edge:** `defaultPreviewAssetsDir()` resolves `preview-ui/dist` relative to compiled output; broken paths if the package is moved without rebuilding the UI.

## Pixi.js v8

**Files:** [`preview-ui/src/`](../play-sdk/preview-ui/src/) — multiverse/canvas modules.

- Scene graph (`Container`, `Graphics`, `Text`), render loop (`ticker` / custom `onTick`/`onFrame`), coordinate systems (screen vs world).
- **Sharp edge:** World coordinates in the preview use a **grid** derived from `worldMap.bounds` and `cellScale`; agent positions are continuous floats — mapping is in `main.ts` (`worldToScreen`).
- **Sharp edge:** Destroying containers and textures on hot reload or theme changes must match Pixi lifecycle to avoid WebGL leaks.

## Browser: EventSource

**Files:** [`main.ts`](../play-sdk/preview-ui/src/main.ts) SSE connection.

- Reconnection behavior is browser-dependent; network drops may require page refresh in dev.
- **Sharp edge:** CORS and credentials if preview is on a different origin than the API.

## Markdown in UI

**Files:** chat-related modules; **marked** + **dompurify**.

- Untrusted model output should stay sanitized; changes to rendering pipeline affect XSS surface.

## World bounds and two runtimes

- Server: `play-world.ts` clamps enriched paths with `clampPathToBounds`.
- Browser: [`world-bounds.ts`](../play-sdk/src/lib/world-bounds.ts) imported via Vite alias into preview UI for client-side clamping and joystick behavior.

**Sharp edge:** Logic drift between server and client if only one side is updated — keep shared math in `world-bounds.ts` and test both packages when changing bounds rules.

## Vitest (dual versions)

- Root `play-sdk` uses Vitest 3; `preview-ui` uses Vitest 4. Run tests **from each package** (`npm test` in `play-sdk` vs `play-sdk/preview-ui`).
