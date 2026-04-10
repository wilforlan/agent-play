import { scrypt } from "@noble/hashes/scrypt";
import { sha256 } from "@noble/hashes/sha256";

const utf8 = new TextEncoder();

function hashLabel(label: string): Uint8Array {
  return sha256(utf8.encode(label));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
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

export type NodeCredential = {
  nodeId: string;
  passw: string;
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

export function derivePasswordFromSecret(input: {
  secretMaterial: Uint8Array;
  rootKey: string;
}): string {
  const normalizedRootKey = input.rootKey.trim().toLowerCase();
  const dk = scrypt(
    input.secretMaterial,
    hashLabel(`agent-play:password:v1:${normalizedRootKey}`),
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

export function deriveNodeIdFromPassword(input: {
  password: string;
  rootKey: string;
}): string {
  const normalizedRootKey = input.rootKey.trim().toLowerCase();
  const dk = scrypt(utf8.encode(input.password), hashLabel(`agent-play:node-id:v1:${normalizedRootKey}`), {
    N: NODE_TOOLS_SCRYPT.N,
    r: NODE_TOOLS_SCRYPT.r,
    p: NODE_TOOLS_SCRYPT.p,
    dkLen: 32,
    maxmem: NODE_TOOLS_SCRYPT.maxmem,
  });
  return bytesToHex(dk);
}

export function validateNodePassword(input: {
  nodeId: string;
  password: string;
  rootKey: string;
}): boolean {
  const expected = deriveNodeIdFromPassword({
    password: input.password,
    rootKey: input.rootKey,
  });
  return expected === input.nodeId.trim().toLowerCase();
}

export function hashNodePassword(password: string): string {
  return bytesToHex(sha256(utf8.encode(password.trim())));
}

export function normalizeNodePassphrase(passw: string): string {
  return passw.trim().replace(/\s+/g, " ");
}

export function nodeCredentialsMaterialFromHumanPassphrase(
  humanPassphrase: string
): string {
  return hashNodePassword(normalizeNodePassphrase(humanPassphrase));
}

export function createNodeCredentialFromPassw(input: {
  passw: string;
  rootKey: string;
}): NodeCredential {
  const normalized = normalizeNodePassphrase(input.passw);
  const nodeId = deriveNodeIdFromPassword({
    password: normalized,
    rootKey: input.rootKey,
  });
  return { nodeId, passw: normalized };
}

export function createNodeCredentialFromSecret(input: {
  secretMaterial: Uint8Array;
  rootKey: string;
}): NodeCredential {
  const passw = derivePasswordFromSecret({
    secretMaterial: input.secretMaterial,
    rootKey: input.rootKey,
  });
  return {
    nodeId: deriveNodeIdFromPassword({ password: passw, rootKey: input.rootKey }),
    passw,
  };
}
