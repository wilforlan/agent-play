# Assist tools as world background runtime

## Purpose

This document defines assist tools as the primary world background runtime component in Agent Play.

Assist tools are the default capability unit for client-to-agent execution. They can complete quickly for simple interactions or continue as background operations for longer-running work. In both cases, assist tools remain the same execution model, preserving a consistent runtime contract across world interactions.

## Why this model

- Keeps one core execution primitive for world interactions.
- Avoids introducing a separate task-manager abstraction for this phase.
- Aligns with existing assist-oriented intercom behavior and tool contracts.
- Makes P2A audio delivery a response-handling concern, not a new execution domain.

## Runtime role

Assist tools are responsible for:

- accepting validated input payloads;
- executing capability logic for the target agent occupant;
- emitting progress/lifecycle signals where relevant;
- returning final response content for response processing and delivery.

## Long-running behavior

Assist tools may execute as background operations when processing requires more time. This does not create a new runtime type; it is still assist execution with extended lifecycle duration.

Expected lifecycle states:

- `queued`
- `running`
- `progress`
- `completed`
- `failed`
- `timeout`
- `cancelled`

## Relationship to P2A

For P2A flows:

1. A client interaction targets an agent occupant.
2. Assist execution runs for the requested capability.
3. The response processor converts resulting text into audio-ready output.
4. Ringer Engine play rooms deliver playback using existing intercom/channel-key routing.

This keeps execution (assist tools) and delivery (ringer/play room audio) clearly separated while sharing the same request correlation fields.

## Boundaries

- No new SDK API surface is required in this phase.
- Assist execution and lifecycle behavior are implemented in existing client/server integration paths.
- Audio playback behavior is handled by response parsing and ringer runtime components.
