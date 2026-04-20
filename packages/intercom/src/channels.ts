export type IntercomChannelParts = {
  humanNodeId: string;
  agentStableKey: string;
};

const INTERCOM_ADDRESS_PREFIX = "intercom-address://";

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

export function buildIntercomAddress(channelKey: string): string {
  return `${INTERCOM_ADDRESS_PREFIX}${channelKey.trim()}`;
}

export function parseIntercomAddress(intercomAddress: string): string {
  const trimmed = intercomAddress.trim();
  if (!trimmed.startsWith(INTERCOM_ADDRESS_PREFIX)) {
    throw new Error("invalid intercom-address");
  }
  const channelKey = trimmed.slice(INTERCOM_ADDRESS_PREFIX.length).trim();
  if (channelKey.length === 0) {
    throw new Error("invalid intercom-address");
  }
  return channelKey;
}
