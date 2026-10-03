# `@agent-play/joe`

Joe is a structured lesson teacher agent. Use it inside Agent Play or as a standalone package in other hosts.

## Install

```bash
npm install @agent-play/joe
```

## Standalone

```ts
import {
  createInMemoryJoeChatStore,
  createOpenAiJoeModel,
  runJoeTurn,
} from "@agent-play/joe";

const store = createInMemoryJoeChatStore();
const model = createOpenAiJoeModel({ apiKey: process.env.OPENAI_API_KEY! });

const lesson = {
  facultyId: "faculty-art",
  pathId: "art-visual-studio",
  lessonId: "art-visual-studio/01-seeing-drawing",
  lessonTitle: "Seeing Before Drawing",
  lessonBody: "...markdown...",
};

const thread = await store.getThread(lesson);
const result = await runJoeTurn({
  lesson,
  history: thread.messages,
  studentText: "How do I start?",
  model,
  now: new Date().toISOString(),
});
await store.appendMessage({ ...lesson, message: {
  id: "s1", role: "student", text: "How do I start?", createdAt: new Date().toISOString(),
}});
await store.appendMessage({ ...lesson, message: result.message });
```

## Agent Play

web-ui hosts Joe server-side (Redis chat history + SDK RPC). The watch UI lesson panel opens a Joe chat dock. Set `OPENAI_API_KEY` and optional `JOE_MODEL` (default `gpt-4o-mini`).

## Contracts

- `JoeMessage` / `JoeThread` — chat history
- `JoeStructuredReply` — robotic cards: headline, concept/example/probe/checkpoint blocks, nextMove, relevance
- `scoreJoeLessonRelevance` — target band 0.8–1.0
- `JoeModel` — inject any model; `createOpenAiJoeModel` is the default adapter
- `JoeChatStore` — inject Redis / DB / memory
