/**
 * @module @agent-play/play-ui/chat-message-reactions
 * Love / thumbs-up reactions with cancel for messaging surfaces.
 */

export const MESSAGE_REACTION_KINDS = ["love", "thumbs_up"] as const;

export type MessageReactionKind = (typeof MESSAGE_REACTION_KINDS)[number];

export type MessageReactions = {
  love: readonly string[];
  thumbs_up: readonly string[];
};

export type MessageReactionAction = "set" | "cancel";

export function createEmptyMessageReactions(): MessageReactions {
  return { love: [], thumbs_up: [] };
}

export function hasPlayerReaction(
  reactions: MessageReactions,
  kind: MessageReactionKind,
  playerId: string
): boolean {
  return reactions[kind].includes(playerId);
}

export function countMessageReactions(reactions: MessageReactions): number {
  return reactions.love.length + reactions.thumbs_up.length;
}

function withoutPlayer(
  playerIds: readonly string[],
  playerId: string
): readonly string[] {
  return playerIds.filter((id) => id !== playerId);
}

export function applyMessageReaction(options: {
  reactions: MessageReactions;
  kind: MessageReactionKind;
  playerId: string;
  action: MessageReactionAction;
}): MessageReactions {
  const playerId = options.playerId.trim();
  if (playerId.length === 0) {
    return options.reactions;
  }

  const cleared: MessageReactions = {
    love: withoutPlayer(options.reactions.love, playerId),
    thumbs_up: withoutPlayer(options.reactions.thumbs_up, playerId),
  };

  if (options.action === "cancel") {
    return cleared;
  }

  return {
    ...cleared,
    [options.kind]: [...cleared[options.kind], playerId],
  };
}

export function normalizeMessageReactions(
  value: unknown
): MessageReactions {
  if (value === null || typeof value !== "object") {
    return createEmptyMessageReactions();
  }
  const record = value as Record<string, unknown>;
  const love = Array.isArray(record.love)
    ? record.love.filter((id): id is string => typeof id === "string")
    : [];
  const thumbsUp = Array.isArray(record.thumbs_up)
    ? record.thumbs_up.filter((id): id is string => typeof id === "string")
    : [];
  return {
    love: [...new Set(love)],
    thumbs_up: [...new Set(thumbsUp)],
  };
}
