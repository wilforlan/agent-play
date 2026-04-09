import { createHash, randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WORDLIST } from "./wordlist.js";

export const NODE_TOOLS_VERSION = 1 as const;
export const ROOT_DERIVATION_DOMAIN_LABEL = "agent-play:merkle-root:v3:scrypt-file";
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

function hashLabel(label: string): Buffer {
  return createHash("sha256").update(label, "utf8").digest();
}

export function loadRootKey(rootFilePath?: string): string {
  const path =
    typeof rootFilePath === "string" && rootFilePath.trim().length > 0
      ? rootFilePath
      : resolve(process.cwd(), ".root");
  return readFileSync(path, "utf8").trim().toLowerCase();
}

/**
 * @deprecated Use rootKey-explicit validation with `validateNodePassword`.
 */
export function loadGenesisRootKeyFromBufferFile(bufferFilePath: string): string {
  const sourceMaterial = readFileSync(resolve(bufferFilePath));
  return deriveRootKeyFromSecret(sourceMaterial);
}

export function deriveRootKeyFromSecret(secretMaterial: Buffer): string {
  const dk = scryptSync(
    secretMaterial,
    hashLabel(ROOT_DERIVATION_DOMAIN_LABEL),
    NODE_TOOLS_SCRYPT.keylen,
    NODE_TOOLS_SCRYPT
  );
  return dk.toString("hex");
}

export function derivePasswordFromSecret(input: {
  secretMaterial: Buffer;
  rootKey: string;
}): string {
  const normalizedRootKey = input.rootKey.trim().toLowerCase();
  const dk = scryptSync(
    input.secretMaterial,
    hashLabel(`agent-play:password:v1:${normalizedRootKey}`),
    32,
    NODE_TOOLS_SCRYPT
  );
  return dk.toString("hex");
}

export function deriveNodeIdFromPassword(input: {
  password: string;
  rootKey: string;
}): string {
  const normalizedRootKey = input.rootKey.trim().toLowerCase();
  const dk = scryptSync(
    Buffer.from(input.password, "utf8"),
    hashLabel(`agent-play:node-id:v1:${normalizedRootKey}`),
    32,
    NODE_TOOLS_SCRYPT
  );
  return dk.toString("hex");
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
  return createHash("sha256")
    .update(password.trim(), "utf8")
    .digest("hex");
}

/**
 * @deprecated Use rootKey-explicit validation with `validateNodePassword`.
 */
export function validateNodeDerivativeFromGenesisSecret(input: {
  nodeId: string;
  password: string;
  genesisSecretMaterial: Buffer;
}): boolean {
  const rootKey = deriveRootKeyFromSecret(input.genesisSecretMaterial);
  return validateNodePassword({
    nodeId: input.nodeId,
    password: input.password,
    rootKey,
  });
}

/**
 * @deprecated Use rootKey-explicit validation with `validateNodePassword`.
 */
export function validateNodeDerivativeFromBufferFile(input: {
  nodeId: string;
  password: string;
  bufferFilePath: string;
}): boolean {
  const rootKey = loadGenesisRootKeyFromBufferFile(input.bufferFilePath);
  return validateNodePassword({
    nodeId: input.nodeId,
    password: input.password,
    rootKey,
  });
}

export function generateNodePassw(): string {
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => WORDLIST[b % WORDLIST.length] ?? "amber").join(" ");
}

export function createNodeCredentialFromPassw(input: {
  passw: string;
  rootKey: string;
}): NodeCredential {
  const normalized = input.passw.trim().replace(/\s+/g, " ");
  const nodeId = deriveNodeIdFromPassword({
    password: normalized,
    rootKey: input.rootKey,
  });
  return { nodeId, passw: normalized };
}

export function createNodeCredentialFromSecret(input: {
  secretMaterial: Buffer;
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
