export type IntercomChannelParts = {
  humanNodeId: string;
  agentStableKey: string;
};

export function encodeHumanStableKeyForIntercom(humanNodeId: string): string {
  return humanNodeId.trim();
}

function agentIdSegmentForIntercomChannel(agentStableKey: string): string {
  const t = agentStableKey.trim();
  if (t.startsWith("agent:")) {
    return t.slice("agent:".length);
  }
  return t;
}

export function buildIntercomChannelKey(parts: IntercomChannelParts): string {
  const human = encodeHumanStableKeyForIntercom(parts.humanNodeId);
  const agentId = agentIdSegmentForIntercomChannel(parts.agentStableKey);
  return `intercom:human:${human}:agent:${agentId}`;
}

export function agentStableKeyFromToPlayerId(toPlayerId: string): string {
  const t = toPlayerId.trim();
  if (t.startsWith("agent:")) {
    return t;
  }
  return `agent:${t}`;
}
