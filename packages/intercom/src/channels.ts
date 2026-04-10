export type IntercomChannelParts = {
  humanNodeId: string;
  agentStableKey: string;
};

export function encodeHumanStableKeyForIntercom(humanNodeId: string): string {
  return JSON.stringify({ __genesis__: humanNodeId });
}

export function buildIntercomChannelKey(parts: IntercomChannelParts): string {
  const human = encodeHumanStableKeyForIntercom(parts.humanNodeId);
  return `intercom:human:${human}:agent:${parts.agentStableKey}`;
}

export function agentStableKeyFromToPlayerId(toPlayerId: string): string {
  const t = toPlayerId.trim();
  if (t.startsWith("agent:")) {
    return t;
  }
  return `agent:${t}`;
}
