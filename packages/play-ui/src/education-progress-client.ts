/**
 * Browser clients for education lesson progress RPCs.
 */

export type EducationLessonProgressRow = {
  readonly facultyId: string;
  readonly pathId: string;
  readonly lessonId: string;
  readonly completedAt: string;
  readonly reflection?: string;
};

export const getEducationProgress = async (input: {
  sid: string;
  playerId: string;
  facultyId: string;
  pathId: string;
  fetcher?: typeof fetch;
}): Promise<readonly EducationLessonProgressRow[]> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "getEducationProgress",
      payload: {
        playerId: input.playerId,
        facultyId: input.facultyId,
        pathId: input.pathId,
      },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: unknown;
    progress?: unknown;
  };
  if (!response.ok) {
    const err =
      typeof json.error === "string" && json.error.length > 0
        ? json.error
        : `HTTP ${String(response.status)}`;
    throw new Error(`[agent-play:education-progress] ${err}`);
  }
  if (!Array.isArray(json.progress)) return [];
  return json.progress.filter(
    (row): row is EducationLessonProgressRow =>
      typeof row === "object" &&
      row !== null &&
      typeof (row as { lessonId?: unknown }).lessonId === "string" &&
      typeof (row as { completedAt?: unknown }).completedAt === "string"
  );
};

export const recordEducationLessonComplete = async (input: {
  sid: string;
  playerId: string;
  facultyId: string;
  pathId: string;
  lessonId: string;
  reflection?: string;
  fetcher?: typeof fetch;
}): Promise<EducationLessonProgressRow> => {
  const fetcher = input.fetcher ?? fetch;
  const url = `/api/agent-play/sdk/rpc?sid=${encodeURIComponent(input.sid)}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      op: "recordEducationLessonComplete",
      payload: {
        playerId: input.playerId,
        facultyId: input.facultyId,
        pathId: input.pathId,
        lessonId: input.lessonId,
        reflection: input.reflection,
      },
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: unknown;
    progress?: unknown;
  };
  if (!response.ok) {
    const err =
      typeof json.error === "string" && json.error.length > 0
        ? json.error
        : `HTTP ${String(response.status)}`;
    throw new Error(`[agent-play:education-progress] ${err}`);
  }
  const row = json.progress;
  if (
    typeof row !== "object" ||
    row === null ||
    typeof (row as { lessonId?: unknown }).lessonId !== "string"
  ) {
    throw new Error("[agent-play:education-progress] missing progress row");
  }
  return row as EducationLessonProgressRow;
};
