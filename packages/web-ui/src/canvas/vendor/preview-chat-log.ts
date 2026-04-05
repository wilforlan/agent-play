export type ChatLine = {
  agentId: string;
  playerName: string;
  role: string;
  text: string;
  seq: number;
};

const CHAT_MAX_MESSAGES = 250;
const CHAT_MAX_TEXT_PER_MESSAGE = 48_000;

let lines: ChatLine[] = [];
let localSeq = 0;

export function resetChatLogFromSnapshot(snapshot: {
  worldMap?: {
    occupants: Array<
      | {
          kind: "agent";
          agentId: string;
          name: string;
          recentInteractions?: { role: string; text: string; seq?: number }[];
        }
      | { kind: "mcp" }
    >;
  };
}): void {
  const merged: ChatLine[] = [];
  for (const o of snapshot.worldMap?.occupants ?? []) {
    if (o.kind !== "agent") continue;
    for (const e of o.recentInteractions ?? []) {
      const t = e.text.trim();
      if (t.length === 0) continue;
      merged.push({
        agentId: o.agentId,
        playerName: o.name,
        role: e.role,
        text: t.slice(0, CHAT_MAX_TEXT_PER_MESSAGE),
        seq: e.seq ?? 0,
      });
    }
  }
  merged.sort((a, b) => {
    if (a.seq !== b.seq) return a.seq - b.seq;
    return `${a.agentId}\0${a.text}`.localeCompare(
      `${b.agentId}\0${b.text}`
    );
  });
  lines = merged.slice(-CHAT_MAX_MESSAGES);
  const maxSeq = lines.reduce((m, l) => (l.seq > m ? l.seq : m), 0);
  localSeq = maxSeq + 1;
}

export function appendChatLogLine(input: {
  agentId: string;
  playerName: string;
  role: string;
  text: string;
  seq?: number;
}): void {
  const t = input.text.trim();
  if (t.length === 0) return;
  const seq = input.seq ?? (localSeq += 1);
  const exists = lines.some(
    (l) => l.agentId === input.agentId && l.seq === seq && l.role === input.role
  );
  if (exists) return;
  lines.push({
    agentId: input.agentId,
    playerName: input.playerName,
    role: input.role,
    text: t.slice(0, CHAT_MAX_TEXT_PER_MESSAGE),
    seq,
  });
  while (lines.length > CHAT_MAX_MESSAGES) lines.shift();
}

export function getChatLogLines(): readonly ChatLine[] {
  return lines;
}

export function getChatLogLinesForAgent(agentId: string): readonly ChatLine[] {
  return lines.filter((l) => l.agentId === agentId);
}

export function clearChatLog(): void {
  lines = [];
  localSeq = 0;
}

export function chatLogMaxTextLength(): number {
  return CHAT_MAX_TEXT_PER_MESSAGE;
}
