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
  const span = 0x100000000;
  const limit = span - (span % max);
  const buf = new Uint32Array(1);
  while (true) {
    crypto.getRandomValues(buf);
    const value = buf[0]!;
    if (value < limit) {
      return value % max;
    }
  }
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
