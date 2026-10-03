const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "is",
  "are",
  "as",
  "with",
  "this",
  "that",
  "you",
  "your",
  "be",
  "by",
  "it",
  "from",
  "at",
  "not",
  "when",
  "how",
  "what",
  "why",
  "into",
  "than",
  "then",
  "also",
  "only",
  "should",
  "about",
  "have",
  "been",
  "were",
  "will",
  "them",
  "they",
  "their",
]);

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !STOP.has(t));

const significantLessonTokens = (lessonBody: string): string[] => {
  const counts = new Map<string, number>();
  for (const token of tokenize(lessonBody)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([token]) => token);
};

/**
 * Token-overlap relevance of a Joe reply against lesson body.
 * Returns a score in [0, 1]; lesson tutoring targets >= 0.8.
 */
export const scoreJoeLessonRelevance = (input: {
  lessonBody: string;
  replyText: string;
}): number => {
  const lessonKey = significantLessonTokens(input.lessonBody);
  const replyTokens = tokenize(input.replyText);
  const replySet = new Set(replyTokens);
  if (lessonKey.length === 0 || replySet.size === 0) return 0;

  let hit = 0;
  for (const token of lessonKey) {
    if (replySet.has(token)) hit += 1;
  }
  if (hit === 0) return 0;

  const coverage = hit / lessonKey.length;
  // Hitting several lesson keywords is enough for the 0.8 tutoring band.
  const keywordBoost = Math.min(1, hit / 3);
  const score = Math.min(1, 0.45 + 0.4 * coverage + 0.35 * keywordBoost);
  return Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));
};
