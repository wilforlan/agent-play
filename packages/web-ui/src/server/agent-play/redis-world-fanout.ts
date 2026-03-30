export function worldFanoutChannel(hostId: string): string {
  return `agent-play:${hostId}:world:events`;
}

export type WorldFanoutMessage = {
  rev: number;
  event: string;
  data: unknown;
};

export function parseWorldFanoutMessage(raw: string): WorldFanoutMessage | null {
  try {
    const p = JSON.parse(raw) as unknown;
    if (typeof p !== "object" || p === null) return null;
    const o = p as Record<string, unknown>;
    if (typeof o.rev !== "number" || typeof o.event !== "string")
      return null;
    return { rev: o.rev, event: o.event, data: o.data };
  } catch {
    return null;
  }
}
