import { randomBytes } from "@noble/hashes/utils";
import { scrypt } from "@noble/hashes/scrypt";
import { sha256 } from "@noble/hashes/sha256";
import { WORDLIST } from "./wordlist.js";

const utf8 = new TextEncoder();

function hashLabel(label: string): Uint8Array {
  return sha256(utf8.encode(label));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeRootKey(rootKey: string): string {
  return rootKey.trim().toLowerCase();
}

function normalizeNodeId(nodeId: string): string {
  return nodeId.trim().toLowerCase();
}

export const NODE_TOOLS_VERSION = 1 as const;

export const ROOT_DERIVATION_DOMAIN_LABEL =
  "agent-play:merkle-root:v3:scrypt-file";

export const NODE_TOOLS_SCRYPT = {
  N: 65536,
  r: 8,
  p: 1,
  maxmem: 128 * 1024 * 1024,
  keylen: 32,
} as const;

/**
 * Result of bootstrapping or reconstructing a node credential.
 *
 * - **`phrase`** is the human-readable 10-word passphrase. It is intended to be shown to a user
 *   once and stored locally (e.g. in `~/.agent-play/credentials.json` or browser storage).
 * - **`passwHash`** is the SHA-256 hex of the normalized phrase. This is the value the SDK and
 *   CLI send as the `x-node-passw` header and as `passwHash` in node-creation request bodies.
 * - **`nodeId`** is the scrypt-derived public id under the given `rootKey`.
 */
export type NodeCredentialMaterial = {
  phrase: string;
  passwHash: string;
  nodeId: string;
};

export function deriveRootKeyFromSecret(secretMaterial: Uint8Array): string {
  const dk = scrypt(secretMaterial, hashLabel(ROOT_DERIVATION_DOMAIN_LABEL), {
    N: NODE_TOOLS_SCRYPT.N,
    r: NODE_TOOLS_SCRYPT.r,
    p: NODE_TOOLS_SCRYPT.p,
    dkLen: NODE_TOOLS_SCRYPT.keylen,
    maxmem: NODE_TOOLS_SCRYPT.maxmem,
  });
  return bytesToHex(dk);
}

/**
 * Derives a node id from already-hashed credential material (`passwHash`) and a `rootKey`.
 *
 * This is the **single canonical** id derivation step. Both clients (CLI / SDK / browser
 * onboarding) and the server use this when they already have hashed material in hand.
 *
 * Callers that start from a human passphrase must hash it first with
 * {@link nodeCredentialsMaterialFromHumanPassphrase} (or use the higher-level
 * {@link nodeCredentialFromHumanPhrase}).
 */
export function deriveNodeIdFromMaterial(input: {
  material: string;
  rootKey: string;
}): string {
  const normalizedRootKey = normalizeRootKey(input.rootKey);
  const dk = scrypt(
    utf8.encode(input.material),
    hashLabel(`agent-play:node-id:v1:${normalizedRootKey}`),
    {
      N: NODE_TOOLS_SCRYPT.N,
      r: NODE_TOOLS_SCRYPT.r,
      p: NODE_TOOLS_SCRYPT.p,
      dkLen: 32,
      maxmem: NODE_TOOLS_SCRYPT.maxmem,
    }
  );
  return bytesToHex(dk);
}

/**
 * Hashes a normalized human passphrase string to credential material.
 *
 * Equivalent to **`sha256(normalizedPassphrase)`** in hex. Callers should generally use
 * {@link nodeCredentialsMaterialFromHumanPassphrase} which normalizes the phrase first.
 */
export function hashNodePassword(password: string): string {
  return bytesToHex(sha256(utf8.encode(password.trim())));
}

/**
 * Collapses runs of whitespace to a single space and trims the phrase.
 */
export function normalizeNodePassphrase(passw: string): string {
  return passw.trim().replace(/\s+/g, " ");
}

/**
 * Hashes a human passphrase to the canonical credential material (SHA-256 hex of the
 * normalized phrase). This is what the CLI / SDK / browser onboarding all send to the server
 * as `passwHash` and `x-node-passw`.
 */
export function nodeCredentialsMaterialFromHumanPassphrase(
  humanPassphrase: string
): string {
  return hashNodePassword(normalizeNodePassphrase(humanPassphrase));
}

/**
 * Generates a fresh 10-word passphrase using the bundled wordlist.
 */
export function generateNodePassw(): string {
  const bytes = randomBytes(10);
  return Array.from(
    bytes,
    (b) => WORDLIST[b % WORDLIST.length] ?? "amber"
  ).join(" ");
}

/**
 * Builds credential material from a known human passphrase. The phrase is normalized and
 * hashed exactly once; the node id is derived from the hashed material.
 */
export function nodeCredentialFromHumanPhrase(input: {
  phrase: string;
  rootKey: string;
}): NodeCredentialMaterial {
  const phrase = normalizeNodePassphrase(input.phrase);
  const passwHash = hashNodePassword(phrase);
  const nodeId = deriveNodeIdFromMaterial({
    material: passwHash,
    rootKey: input.rootKey,
  });
  return { phrase, passwHash, nodeId };
}

/**
 * Derives the node id from already-hashed credential material. Used by the SDK after it
 * reads the human passphrase from `credentials.json` and hashes it once at startup.
 */
export function nodeCredentialFromPasswHash(input: {
  passwHash: string;
  rootKey: string;
}): { passwHash: string; nodeId: string } {
  const nodeId = deriveNodeIdFromMaterial({
    material: input.passwHash,
    rootKey: input.rootKey,
  });
  return { passwHash: input.passwHash, nodeId };
}

/**
 * Generates a brand-new credential (phrase, hash, node id) under a `rootKey`. Used by the CLI
 * for both main-node and agent-node bootstrap and by the server-side space-node fallback.
 */
export function createNodeCredentialMaterial(input: {
  rootKey: string;
}): NodeCredentialMaterial {
  const phrase = generateNodePassw();
  return nodeCredentialFromHumanPhrase({ phrase, rootKey: input.rootKey });
}

/**
 * Verifies a stored `passwHash` corresponds to `nodeId` under `rootKey`. This is the only
 * comparison the server should ever perform; it never re-hashes the supplied material.
 */
export function verifyStoredNodeCredential(input: {
  nodeId: string;
  passwHash: string;
  rootKey: string;
}): boolean {
  if (input.passwHash.length === 0) {
    return false;
  }
  const derived = deriveNodeIdFromMaterial({
    material: input.passwHash,
    rootKey: input.rootKey,
  });
  return derived === normalizeNodeId(input.nodeId);
}
