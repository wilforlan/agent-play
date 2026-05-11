import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export {
  NODE_TOOLS_VERSION,
  ROOT_DERIVATION_DOMAIN_LABEL,
  NODE_TOOLS_SCRYPT,
  type NodeCredentialMaterial,
  deriveRootKeyFromSecret,
  deriveNodeIdFromMaterial,
  hashNodePassword,
  normalizeNodePassphrase,
  nodeCredentialsMaterialFromHumanPassphrase,
  generateNodePassw,
  nodeCredentialFromHumanPhrase,
  nodeCredentialFromPasswHash,
  createNodeCredentialMaterial,
  verifyStoredNodeCredential,
} from "./derivation.js";

export function loadRootKey(rootFilePath?: string): string {
  const path =
    typeof rootFilePath === "string" && rootFilePath.trim().length > 0
      ? rootFilePath
      : resolve(process.cwd(), ".root");
  return readFileSync(path, "utf8").trim().toLowerCase();
}

export {
  type AgentPlayAgentNodeEntry,
  type AgentPlayCredentialsFile,
  loadAgentPlayCredentialsFileFromPath,
  loadAgentPlayCredentialsFileFromPathSync,
  parseAgentPlayCredentialsJson,
  resolveAgentPlayCredentialsPath,
} from "./agent-play-credentials.js";
