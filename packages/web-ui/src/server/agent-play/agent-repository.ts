export type StoredAgentRecord = {
  agentId: string;
  nodeId: string;
  name: string;
  toolNames: string[];
  zoneCount: number;
  yieldCount: number;
  flagged: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAgentRecordInput = {
  name?: string;
  toolNames: string[];
  nodeId: string;
  agentId: string;
};

/**
 * Input for attaching a new agent node to a main node. The caller (CLI / SDK) hashes the
 * generated passphrase locally and forwards both the derived **`agentId`** and the hashed
 * **`passwHash`**; the server never receives or computes the raw phrase.
 */
export type CreateAgentNodeRecordInput = {
  parentNodeId: string;
  agentId: string;
  passwHash: string;
};

export type NodeKind = "root" | "main" | "agent" | "space";

/**
 * Input for creating a node record.
 *
 * - **`main`**: caller (CLI or preview onboarding) sends the locally derived **`nodeId`** and
 *   the **`passwHash`** (hex SHA-256 of the normalized passphrase). The server only verifies
 *   that the pair derives correctly under the current root key; it never re-hashes anything.
 * - **`space`**: callers may omit **`passwHash`** to ask the server to generate a one-time
 *   phrase, hash it, and return the phrase to the requester once. When **`passwHash`** is
 *   supplied, the server treats it as already-hashed material and stores it directly.
 */
export type CreateNodeRecordInput =
  | {
      kind: "main";
      nodeId: string;
      passwHash: string;
    }
  | {
      kind: "space";
      spaceId: string;
      passwHash?: string;
    };

export type CreateAgentRecordResult = {
  agentId: string;
};

export type CreateNodeResult = {
  nodeId: string;
  /** Human-readable passphrase returned once when creating a space node server-side. */
  phrase?: string;
};

export type NodeAuthRecord = {
  nodeId: string;
  kind: NodeKind;
  parentNodeId?: string;
  /** Catalog space id when kind is space (dashboard authorization). */
  spaceId?: string;
  /** Hashed credential material (hex SHA-256). Never the raw passphrase. */
  passwHash?: string;
  createdAt: string;
  agentNodeIds?: string[];
};

export type DeleteMainNodeCascadeResult = {
  deletedAgentCount: number;
};

export type AgentRepository = {
  getGenesisNodeId(): string;
  validateNodeIdentity(input: {
    nodeId: string;
    rootKey: string;
    mainNodeId?: string;
    /** Client-supplied hashed passphrase (`x-node-passw`); compared to stored hash after derivation check. */
    passwHash?: string;
  }): Promise<{ ok: boolean; reason?: string; nodeKind?: NodeKind }>;
  findAccountIdForAgentNode(agentId: string): Promise<string | null>;
  createNode(input: CreateNodeRecordInput): Promise<CreateNodeResult>;
  /**
   * Compare an already-hashed `passwHash` against the stored credential. The server never
   * re-hashes the supplied material; this is a constant-time compare and a re-derivation
   * check under the current root key.
   */
  verifyNodePasswHash(input: {
    nodeId: string;
    passwHash: string;
  }): Promise<boolean>;
  getNode(nodeId: string): Promise<NodeAuthRecord | null>;
  deleteMainNodeCascade(
    nodeId: string
  ): Promise<DeleteMainNodeCascadeResult>;
  createAgentNode(
    input: CreateAgentNodeRecordInput
  ): Promise<CreateAgentRecordResult>;
  getAgent(agentId: string): Promise<StoredAgentRecord | null>;
  listAgentsForNode(nodeId: string): Promise<StoredAgentRecord[]>;
  deleteAgent(agentId: string): Promise<boolean>;
  incrementZoneCount(agentId: string): Promise<StoredAgentRecord | null>;
  incrementYieldCount(agentId: string): Promise<StoredAgentRecord | null>;
};
