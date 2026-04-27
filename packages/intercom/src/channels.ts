export type IntercomChannelParts = {
  humanNodeId: string;
  agentStableKey: string;
};

const DEFAULT_INTERCOM_PROTOCOL = "ap-intercom";
const INTERCOM_PROTOCOL_PATTERN = /^[a-z][a-z0-9-]*$/;

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
  const value = channelKey.trim();
  if (value.length === 0) {
    throw new Error("invalid intercom-address");
  }
  return `${DEFAULT_INTERCOM_PROTOCOL}://${value}`;
}

export function parseIntercomAddressParts(intercomAddress: string): {
  protocol: string;
  value: string;
} {
  const trimmed = intercomAddress.trim();
  const delimiterIndex = trimmed.indexOf("://");
  if (delimiterIndex <= 0) {
    throw new Error("invalid intercom-address");
  }
  const protocol = trimmed.slice(0, delimiterIndex).trim().toLowerCase();
  const value = trimmed.slice(delimiterIndex + 3).trim();
  if (!INTERCOM_PROTOCOL_PATTERN.test(protocol) || !protocol.endsWith("-intercom")) {
    throw new Error("invalid intercom-address");
  }
  if (value.length === 0) {
    throw new Error("invalid intercom-address");
  }
  return { protocol, value };
}

export function parseIntercomAddress(intercomAddress: string): string {
  return parseIntercomAddressParts(intercomAddress).value;
}
