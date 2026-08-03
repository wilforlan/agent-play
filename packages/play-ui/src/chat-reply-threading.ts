/**
 * @module @agent-play/play-ui/chat-reply-threading
 * Two-layer reply threading helpers for messaging surfaces.
 */

export const MAX_REPLY_DEPTH = 2;

export type ReplyDepth = 0 | 1 | 2;

export type ThreadableMessage = {
  requestId: string;
  seq: number;
  parentRequestId: string | null;
  depth: ReplyDepth;
};

export function canReplyToDepth(depth: number): boolean {
  return Number.isInteger(depth) && depth >= 0 && depth < MAX_REPLY_DEPTH;
}

export function resolveReplyDepth(parentDepth: number): ReplyDepth | null {
  if (!canReplyToDepth(parentDepth)) {
    return null;
  }
  return (parentDepth + 1) as ReplyDepth;
}

export function sortThreadedMessages<T extends ThreadableMessage>(
  messages: readonly T[]
): T[] {
  const byId = new Map(messages.map((message) => [message.requestId, message]));
  const children = new Map<string, T[]>();

  for (const message of messages) {
    const parentId = message.parentRequestId;
    if (parentId === null || !byId.has(parentId)) {
      continue;
    }
    const list = children.get(parentId) ?? [];
    children.set(parentId, [...list, message]);
  }

  for (const [parentId, list] of children) {
    children.set(
      parentId,
      [...list].sort((a, b) => a.seq - b.seq)
    );
  }

  const roots = messages
    .filter(
      (message) =>
        message.parentRequestId === null ||
        !byId.has(message.parentRequestId)
    )
    .sort((a, b) => a.seq - b.seq);

  const ordered: T[] = [];
  const visit = (message: T): void => {
    ordered.push(message);
    const nested = children.get(message.requestId) ?? [];
    for (const child of nested) {
      visit(child);
    }
  };
  for (const root of roots) {
    visit(root);
  }
  return ordered;
}
