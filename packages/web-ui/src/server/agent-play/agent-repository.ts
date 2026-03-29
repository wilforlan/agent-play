export type StoredAgentRecord = {
  agentId: string;
  userId: string;
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
  userId: string;
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
  listAgentsForUser(userId: string): Promise<StoredAgentRecord[]>;
  deleteAgent(agentId: string): Promise<boolean>;
  incrementZoneCount(agentId: string): Promise<StoredAgentRecord | null>;
  incrementYieldCount(agentId: string): Promise<StoredAgentRecord | null>;
};
