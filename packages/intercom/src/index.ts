/**
 * @packageDocumentation
 * **@agent-play/intercom** — shared contracts for human–agent intercom (assist and chat) on the Agent Play wire.
 *
 * Exports channel key helpers ({@link buildIntercomChannelKey}), stable operation ids, SSE/world event names,
 * Zod-backed parsers ({@link parseIntercomCommandPayload}), and payload types aligned with the web UI and **@agent-play/sdk**.
 *
 * **Dependency order** — This package is published after **@agent-play/node-tools** and before **@agent-play/sdk**
 * in the monorepo release pipeline.
 */
export * from "./channels.js";
export * from "./contracts.js";
export * from "./event-types.js";
export * from "./ids.js";
export * from "./intercom-channel-state.js";
export * from "./validator.js";
