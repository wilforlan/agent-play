import type { NodeAuthRecord } from "./agent-repository.js";

export type PublicMainNodeAuth = {
  nodeId: string;
  kind: NodeAuthRecord["kind"];
  parentNodeId?: string;
  spaceId?: string;
  createdAt: string;
  agentNodeIds: string[];
};

export function toPublicMainNodeAuth(record: NodeAuthRecord): PublicMainNodeAuth {
  const base: PublicMainNodeAuth = {
    nodeId: record.nodeId,
    kind: record.kind,
    parentNodeId: record.parentNodeId,
    createdAt: record.createdAt,
    agentNodeIds: record.agentNodeIds ?? [],
  };
  if (record.spaceId !== undefined && record.spaceId.length > 0) {
    base.spaceId = record.spaceId;
  }
  return base;
}
