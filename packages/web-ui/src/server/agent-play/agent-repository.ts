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

export type CreateAgentNodeRecordInput = {
  parentNodeId: string;
  agentId: string;
  passw: string;
};

export type NodeKind = "root" | "main" | "agent";

export type CreateNodeRecordInput = {
  kind: "main";
  passw: string;
};

export type CreateAgentRecordResult = {
  agentId: string;
};

export type CreateNodeResult = {
  nodeId: string;
};

export type NodeAuthRecord = {
  nodeId: string;
  kind: NodeKind;
  parentNodeId?: string;
  passw?: string;
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
  }): Promise<{ ok: boolean; reason?: string; nodeKind?: NodeKind }>;
  findAccountIdForAgentNode(agentId: string): Promise<string | null>;
  createNode(input: CreateNodeRecordInput): Promise<CreateNodeResult>;
  verifyNodePassw(nodeId: string, passw: string): Promise<boolean>;
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
