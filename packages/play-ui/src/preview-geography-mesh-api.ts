/**
 * @module @agent-play/play-ui/preview-geography-mesh-api
 * Host signaling HTTP helpers for AOI geography mesh.
 */

import type {
  GeographyCoarseBody,
  GeographyMembershipBody,
  GeographyNeighborsPayload,
  GeographySignalBody,
} from "@agent-play/geography-mesh";

export type GeographyMembershipJoinResponse = {
  ok: true;
  joined: boolean;
  memberCount: number;
  neighbors: GeographyNeighborsPayload;
};

export type GeographyMembershipCapError = {
  error: "cap_reached";
  message: string;
  memberCount: number;
  cap: number;
};

const apiUrl = (apiBase: string, path: string, sid: string): string =>
  `${apiBase.replace(/\/$/, "")}${path}?sid=${encodeURIComponent(sid)}`;

export async function postGeographyMembership(options: {
  apiBase: string;
  sid: string;
  body: GeographyMembershipBody;
}): Promise<
  | { ok: true; data: GeographyMembershipJoinResponse | { ok: true; memberCount: number } }
  | { ok: false; status: number; cap?: GeographyMembershipCapError }
> {
  const res = await fetch(
    apiUrl(options.apiBase, "/geography/membership", options.sid),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(options.body),
    }
  );
  if (res.status === 409) {
    const cap = (await res.json()) as GeographyMembershipCapError;
    return { ok: false, status: 409, cap };
  }
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const data = (await res.json()) as
    | GeographyMembershipJoinResponse
    | { ok: true; memberCount: number };
  return { ok: true, data };
}

export async function postGeographyCoarse(options: {
  apiBase: string;
  sid: string;
  body: GeographyCoarseBody;
}): Promise<GeographyNeighborsPayload | null> {
  const res = await fetch(
    apiUrl(options.apiBase, "/geography/coarse", options.sid),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(options.body),
    }
  );
  if (!res.ok) {
    return null;
  }
  const json = (await res.json()) as {
    ok: boolean;
    neighbors: GeographyNeighborsPayload | null;
  };
  return json.neighbors;
}

export async function postGeographySignal(options: {
  apiBase: string;
  sid: string;
  body: GeographySignalBody;
}): Promise<boolean> {
  const res = await fetch(
    apiUrl(options.apiBase, "/geography/signal", options.sid),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(options.body),
    }
  );
  return res.ok;
}
