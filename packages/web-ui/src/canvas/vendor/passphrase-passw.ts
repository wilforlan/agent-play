import {
  passphraseAdjectives,
  passphraseAdverbs,
  passphraseNouns,
  passphraseVerbs,
} from "./passphrase-wordlist-data.js";

const BUCKETS = [
  passphraseAdverbs,
  passphraseAdjectives,
  passphraseVerbs,
  passphraseNouns,
] as const;

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
