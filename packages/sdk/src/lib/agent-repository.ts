export type StoredAgentRecord = {
  agentId: string;
  name: string;
  apiKeyHash: string;
  toolNames: string[];
  zoneCount: number;
  yieldCount: number;
  flagged: boolean;
  createdAt: string;
  updatedAt: string;
  lookupIndex?: string;
};

export type CreateAgentRecordInput = {
  name: string;
  toolNames: string[];
};

export type CreateAgentRecordResult = {
  agentId: string;
  plainApiKey: string;
};

export type AgentRepository = {
  createAgent(
    input: CreateAgentRecordInput
  ): Promise<CreateAgentRecordResult>;
  verifyApiKeyAndGetAgentId(plainApiKey: string): Promise<string | null>;
  getAgent(agentId: string): Promise<StoredAgentRecord | null>;
  listAgents(): Promise<StoredAgentRecord[]>;
  deleteAgent(agentId: string): Promise<boolean>;
  incrementZoneCount(agentId: string): Promise<StoredAgentRecord | null>;
  incrementYieldCount(agentId: string): Promise<StoredAgentRecord | null>;
};
