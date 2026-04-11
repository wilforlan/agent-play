/**
 * @module @agent-play/play-ui/passphrase-passw
 * passphrase passw — preview canvas module (Pixi + DOM).
 */
import {
  passphraseAdjectives,
  passphraseAdverbs,
  passphraseNouns,
  passphraseVerbs,
} from "./passphrase-wordlist-data.js";

const BUCKETS: readonly (readonly string[])[] = [
  passphraseAdverbs,
  passphraseAdjectives,
  passphraseVerbs,
  passphraseNouns,
];

function secureRandomUintBelow(max: number): number {
  if (max <= 0) {
    throw new Error("max must be positive");
  }
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! % max;
}

export function generateNodePassphraseWordCount(wordCount: number): string {
  if (!Number.isInteger(wordCount) || wordCount < 1) {
    throw new Error("wordCount must be a positive integer");
  }
  const parts: string[] = [];
  for (let i = 0; i < wordCount; i += 1) {
    const bucket = BUCKETS[i % BUCKETS.length];
    if (bucket.length === 0) {
      throw new Error("passphrase word bucket is empty");
    }
    const idx = secureRandomUintBelow(bucket.length);
    parts.push(bucket[idx]!);
  }
  return parts.join(" ");
}
