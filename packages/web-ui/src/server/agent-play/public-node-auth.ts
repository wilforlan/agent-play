import type { NodeAuthRecord } from "./agent-repository.js";

export type PublicMainNodeAuth = {
  nodeId: string;
  kind: NodeAuthRecord["kind"];
  parentNodeId?: string;
  createdAt: string;
  agentNodeIds: string[];
};

export function toPublicMainNodeAuth(record: NodeAuthRecord): PublicMainNodeAuth {
  return {
    nodeId: record.nodeId,
    kind: record.kind,
    parentNodeId: record.parentNodeId,
    createdAt: record.createdAt,
    agentNodeIds: record.agentNodeIds ?? [],
  };
}
