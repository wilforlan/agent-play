/**
 * Browser clients for Joe lesson-teacher RPCs.
 */

export type JoeReplyBlock = {
  readonly kind: "concept" | "example" | "probe" | "checkpoint";
  readonly body: string;
};

export type JoeStructuredReply = {
  readonly headline: string;
  readonly blocks: readonly JoeReplyBlock[];
  readonly nextMove: string;
  readonly relevance: number;
};

export type JoeChatMessage = {
  readonly id: string;
  readonly role: "student" | "joe";
  readonly text: string;
  readonly createdAt: string;
  readonly structured?: JoeStructuredReply;
};

export type JoeChatThread = {
  readonly facultyId: string;
  readonly pathId: string;
  readonly lessonId: string;
  readonly messages: readonly JoeChatMessage[];
};

const isJoeMessage = (value: unknown): value is JoeChatMessage => {
  if (typeof value !== "object" || value === null) return false;
  const row = value as {
    id?: unknown;
    role?: unknown;
    text?: unknown;
    createdAt?: unknown;
  };
  return (
    typeof row.id === "string" &&
    (row.role === "student" || row.role === "joe") &&
    typeof row.text === "string" &&
    typeof row.createdAt === "string"
  );
};

export const getJoeLessonChat = async (input: {
  sid: string;
  playerId: string;
  facultyId: string;
  pathId: string;
  lessonId: string;
  fetcher?: typeof fetch;
}): Promise<JoeChatThread> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "getJoeLessonChat",
      payload: {
        playerId: input.playerId,
        facultyId: input.facultyId,
        pathId: input.pathId,
        lessonId: input.lessonId,
      },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: unknown;
    thread?: unknown;
  };
  if (!response.ok) {
    const err =
      typeof json.error === "string" && json.error.length > 0
        ? json.error
        : `HTTP ${String(response.status)}`;
    throw new Error(`[agent-play:joe] ${err}`);
  }
  const thread = json.thread;
  if (typeof thread !== "object" || thread === null) {
    return {
      facultyId: input.facultyId,
      pathId: input.pathId,
      lessonId: input.lessonId,
      messages: [],
    };
  }
  const row = thread as {
    facultyId?: unknown;
    pathId?: unknown;
    lessonId?: unknown;
    messages?: unknown;
  };
  const messages = Array.isArray(row.messages)
    ? row.messages.filter(isJoeMessage)
    : [];
  return {
    facultyId:
      typeof row.facultyId === "string" ? row.facultyId : input.facultyId,
    pathId: typeof row.pathId === "string" ? row.pathId : input.pathId,
    lessonId: typeof row.lessonId === "string" ? row.lessonId : input.lessonId,
    messages,
  };
};

export const sendJoeLessonMessage = async (input: {
  sid: string;
  playerId: string;
  facultyId: string;
  pathId: string;
  lessonId: string;
  text: string;
  lessonTitle: string;
  lessonBody: string;
  pathTitle?: string;
  facultyLabel?: string;
  fetcher?: typeof fetch;
}): Promise<JoeChatThread> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "sendJoeLessonMessage",
      payload: {
        playerId: input.playerId,
        facultyId: input.facultyId,
        pathId: input.pathId,
        lessonId: input.lessonId,
        text: input.text,
        lessonTitle: input.lessonTitle,
        lessonBody: input.lessonBody,
        pathTitle: input.pathTitle,
        facultyLabel: input.facultyLabel,
      },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: unknown;
    thread?: unknown;
  };
  if (!response.ok) {
    const err =
      typeof json.error === "string" && json.error.length > 0
        ? json.error
        : `HTTP ${String(response.status)}`;
    throw new Error(`[agent-play:joe] ${err}`);
  }
  const thread = json.thread;
  if (typeof thread !== "object" || thread === null) {
    throw new Error("[agent-play:joe] missing thread");
  }
  const row = thread as {
    facultyId?: unknown;
    pathId?: unknown;
    lessonId?: unknown;
    messages?: unknown;
  };
  const messages = Array.isArray(row.messages)
    ? row.messages.filter(isJoeMessage)
    : [];
  return {
    facultyId:
      typeof row.facultyId === "string" ? row.facultyId : input.facultyId,
    pathId: typeof row.pathId === "string" ? row.pathId : input.pathId,
    lessonId: typeof row.lessonId === "string" ? row.lessonId : input.lessonId,
    messages,
  };
};
