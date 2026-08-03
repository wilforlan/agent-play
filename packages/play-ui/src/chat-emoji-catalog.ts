/**
 * @module @agent-play/play-ui/chat-emoji-catalog
 * Fixed catalog of unique chat emojis for the messaging composer.
 */

export const CHAT_EMOJI_LIMIT = 50;

export const CHAT_EMOJI_CATALOG = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🙂",
  "😉",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😋",
  "😜",
  "🤪",
  "😝",
  "🤑",
  "🤗",
  "🤔",
  "🤨",
  "😐",
  "😑",
  "😶",
  "🙄",
  "😏",
  "😣",
  "😥",
  "😮",
  "🤐",
  "😯",
  "😪",
  "😫",
  "🥱",
  "😴",
  "😌",
  "😛",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🤝",
  "🙏",
  "💪",
  "🔥",
  "✨",
  "💯",
] as const;

export type ChatEmoji = (typeof CHAT_EMOJI_CATALOG)[number];

const emojiSet = new Set<string>(CHAT_EMOJI_CATALOG);

export function isChatEmoji(value: string): value is ChatEmoji {
  return emojiSet.has(value);
}
