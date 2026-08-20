export const MAIN_WORLD_HOST = "world1.v0peer.org" as const;

export const MAIN_WORLD_ORIGIN = `https://${MAIN_WORLD_HOST}` as const;

export const MAIN_WORLD_API_BASE = `${MAIN_WORLD_ORIGIN}/api/agent-play` as const;

export const LEGACY_MAIN_WORLD_HOSTS = [
  "agent-play.com",
  "www.agent-play.com",
  "playworld.world",
] as const;

export type ResolveMainWorldBaseUrlOptions = {
  envValue?: string;
};

export const resolveMainWorldBaseUrl = (
  options: ResolveMainWorldBaseUrlOptions = {},
): string => {
  const trimmed = options.envValue?.trim();
  if (trimmed !== undefined && trimmed.length > 0) {
    return trimmed.replace(/\/$/, "");
  }
  return MAIN_WORLD_ORIGIN;
};

export const mainWorldApiUrl = (path: string): string => {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${MAIN_WORLD_API_BASE}${suffix}`;
};
