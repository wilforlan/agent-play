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
  name: string;
  toolNames: string[];
  nodeId: string;
};

export type CreateAgentRecordResult = {
  agentId: string;
};

export type CreateNodeResult = {
  nodeId: string;
};

export type NodeAuthRecord = {
  nodeId: string;
  createdAt: string;
};

export type AgentRepository = {
  createNode(passw: string): Promise<CreateNodeResult>;
  verifyNodePassw(nodeId: string, passw: string): Promise<boolean>;
  getNode(nodeId: string): Promise<NodeAuthRecord | null>;
  createAgent(input: CreateAgentRecordInput): Promise<CreateAgentRecordResult>;
  getAgent(agentId: string): Promise<StoredAgentRecord | null>;
  listAgentsForNode(nodeId: string): Promise<StoredAgentRecord[]>;
  deleteAgent(agentId: string): Promise<boolean>;
  incrementZoneCount(agentId: string): Promise<StoredAgentRecord | null>;
  incrementYieldCount(agentId: string): Promise<StoredAgentRecord | null>;
};
