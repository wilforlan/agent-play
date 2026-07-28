export type HumanWorldPosition = {
  x: number;
  y: number;
};

export type StoredHumanWorldPosition = HumanWorldPosition & {
  sid: string;
};

export const PREVIEW_HUMAN_WORLD_POS_STORAGE_KEY =
  "agent-play-preview-human-world-pos-v1";

let cached: StoredHumanWorldPosition | null = null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const parseStored = (raw: string | null): StoredHumanWorldPosition | null => {
  if (raw === null || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.sid !== "string" || record.sid.length === 0) return null;
    if (!isFiniteNumber(record.x) || !isFiniteNumber(record.y)) return null;
    return { sid: record.sid, x: record.x, y: record.y };
  } catch {
    return null;
  }
};

export const clearHumanWorldPosition = (): void => {
  cached = null;
};

export const loadHumanWorldPosition = (options: {
  sid: string | null;
}): HumanWorldPosition | null => {
  if (options.sid === null) return null;
  if (cached === null) {
    const raw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(PREVIEW_HUMAN_WORLD_POS_STORAGE_KEY)
        : null;
    cached = parseStored(raw);
  }
  if (cached === null || cached.sid !== options.sid) return null;
  return { x: cached.x, y: cached.y };
};

export const saveHumanWorldPosition = (options: {
  sid: string;
  x: number;
  y: number;
}): void => {
  if (
    options.sid.length === 0 ||
    !Number.isFinite(options.x) ||
    !Number.isFinite(options.y)
  ) {
    return;
  }
  cached = { sid: options.sid, x: options.x, y: options.y };
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    PREVIEW_HUMAN_WORLD_POS_STORAGE_KEY,
    JSON.stringify(cached)
  );
};

if (typeof localStorage !== "undefined") {
  cached = parseStored(
    localStorage.getItem(PREVIEW_HUMAN_WORLD_POS_STORAGE_KEY)
  );
}
