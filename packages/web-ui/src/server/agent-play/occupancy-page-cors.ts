export const OCCUPANCY_PAGE_CORS_ALLOW_HEADERS =
  "Content-Type, x-node-id, x-node-passw";

const PUBLIC_SITE_ROOTS = [
  "agent-play.com",
  "v0peer.org",
  "playworld.world",
] as const;

const isIpv4Address = (hostname: string): number[] | null => {
  const parts = hostname.split(".");
  if (parts.length !== 4) {
    return null;
  }
  const octets = parts.map((part) => Number(part));
  if (
    octets.some(
      (octet) => !Number.isInteger(octet) || octet < 0 || octet > 255
    )
  ) {
    return null;
  }
  return octets;
};

const isLoopbackHost = (hostname: string): boolean => {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
};

const isPrivateIpv4Host = (hostname: string): boolean => {
  const octets = isIpv4Address(hostname);
  if (octets === null) {
    return false;
  }
  const first = octets[0];
  const second = octets[1];
  if (first === undefined || second === undefined) {
    return false;
  }
  if (first === 10) {
    return true;
  }
  if (first === 192 && second === 168) {
    return true;
  }
  return first === 172 && second >= 16 && second <= 31;
};

const isLocalHost = (hostname: string): boolean => {
  return (
    isLoopbackHost(hostname) ||
    hostname.endsWith(".local") ||
    isPrivateIpv4Host(hostname)
  );
};

const hostMatchesRoot = (hostname: string, root: string): boolean => {
  return hostname === root || hostname.endsWith(`.${root}`);
};

export const isOccupancyPageOrigin = (origin: string): boolean => {
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    if (isLocalHost(hostname)) {
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    }
    if (parsed.protocol !== "https:") {
      return false;
    }
    return PUBLIC_SITE_ROOTS.some((root) => hostMatchesRoot(hostname, root));
  } catch {
    return false;
  }
};

export const occupancyPageCorsHeaders = (
  originHeader: string | null
): Record<string, string> => {
  if (originHeader === null || !isOccupancyPageOrigin(originHeader)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": originHeader,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": OCCUPANCY_PAGE_CORS_ALLOW_HEADERS,
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
};

export const occupancyPagePreflightResponse = (
  originHeader: string | null
): Response => {
  return new Response(null, {
    status: 204,
    headers: occupancyPageCorsHeaders(originHeader),
  });
};
