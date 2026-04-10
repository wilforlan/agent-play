import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  deriveRootKeyFromSecret,
  validateNodePassword,
} from "./derivation.js";
import { WORDLIST } from "./wordlist.js";

export {
  NODE_TOOLS_VERSION,
  ROOT_DERIVATION_DOMAIN_LABEL,
  NODE_TOOLS_SCRYPT,
  type NodeCredential,
  deriveRootKeyFromSecret,
  derivePasswordFromSecret,
  deriveNodeIdFromPassword,
  validateNodePassword,
  hashNodePassword,
  normalizeNodePassphrase,
  nodeCredentialsMaterialFromHumanPassphrase,
  createNodeCredentialFromPassw,
  createNodeCredentialFromSecret,
} from "./derivation.js";

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
  return deriveRootKeyFromSecret(new Uint8Array(sourceMaterial));
}

/**
 * @deprecated Use rootKey-explicit validation with `validateNodePassword`.
 */
export function validateNodeDerivativeFromGenesisSecret(input: {
  nodeId: string;
  password: string;
  genesisSecretMaterial: Buffer;
}): boolean {
  const rootKey = deriveRootKeyFromSecret(
    new Uint8Array(input.genesisSecretMaterial)
  );
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

export {
  type AgentPlayAgentNodeEntry,
  type AgentPlayCredentialsFile,
  loadAgentPlayCredentialsFileFromPath,
  loadAgentPlayCredentialsFileFromPathSync,
  parseAgentPlayCredentialsJson,
  resolveAgentPlayCredentialsPath,
} from "./agent-play-credentials.js";
