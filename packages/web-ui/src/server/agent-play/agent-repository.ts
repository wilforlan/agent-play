export type StoredAgentRecord = {
  agentId: string;
  userId: string;
  name: string;
  toolNames: string[];
  zoneCount: number;
  yieldCount: number;
  flagged: boolean;
  createdAt: string;
  updatedAt: string;
  apiKeyHash?: string;
  lookupIndex?: string;
};

export type CreateAgentRecordInput = {
  name: string;
  toolNames: string[];
  userId: string;
};

export type CreateAgentRecordResult = {
  agentId: string;
};

export type CreateApiKeyResult = {
  plainApiKey: string;
};

export type ApiKeyMetadata = {
  hasKey: boolean;
  createdAt?: string;
};

export type AgentRepository = {
  createApiKey(userId: string): Promise<CreateApiKeyResult>;
  getApiKeyMetadata(userId: string): Promise<ApiKeyMetadata>;
  createAgent(input: CreateAgentRecordInput): Promise<CreateAgentRecordResult>;
  verifyApiKeyForUser(plainApiKey: string): Promise<string | null>;
  getAgent(agentId: string): Promise<StoredAgentRecord | null>;
  listAgentsForUser(userId: string): Promise<StoredAgentRecord[]>;
  deleteAgent(agentId: string): Promise<boolean>;
  incrementZoneCount(agentId: string): Promise<StoredAgentRecord | null>;
  incrementYieldCount(agentId: string): Promise<StoredAgentRecord | null>;
};
