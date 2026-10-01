import { describe, expect, it } from "vitest";
import {
  applyOccupancyPageCorsHeaders,
  isOccupancyPageOrigin,
  mergeVaryOrigin,
  occupancyPageCorsHeaders,
} from "./occupancy-page-cors";

describe("occupancy page CORS", () => {
  it("allows local origins for local-to-local requests", () => {
    expect(isOccupancyPageOrigin("http://localhost:5173")).toBe(true);
    expect(isOccupancyPageOrigin("http://localhost:3000")).toBe(true);
    expect(isOccupancyPageOrigin("https://localhost:5173")).toBe(true);
    expect(isOccupancyPageOrigin("http://127.0.0.1:5173")).toBe(true);
    expect(isOccupancyPageOrigin("http://[::1]:5173")).toBe(true);
    expect(isOccupancyPageOrigin("http://192.168.1.20:5173")).toBe(true);
    expect(isOccupancyPageOrigin("http://10.0.0.8:3000")).toBe(true);
    expect(isOccupancyPageOrigin("http://world2.localhost:5173")).toBe(true);
  });

  it("allows agent-play.com, v0peer.org, and playworld.world including subdomains", () => {
    expect(isOccupancyPageOrigin("https://agent-play.com")).toBe(true);
    expect(isOccupancyPageOrigin("https://www.agent-play.com")).toBe(true);
    expect(isOccupancyPageOrigin("https://world2.v0peer.org")).toBe(true);
    expect(isOccupancyPageOrigin("https://world1.v0peer.org")).toBe(true);
    expect(isOccupancyPageOrigin("https://playworld.world")).toBe(true);
    expect(isOccupancyPageOrigin("https://www.playworld.world")).toBe(true);
  });

  it("does not allow unrelated hosts", () => {
    expect(isOccupancyPageOrigin("https://evil.example")).toBe(false);
    expect(isOccupancyPageOrigin("https://agent-play.com.evil.example")).toBe(
      false
    );
  });

  it("echoes an allowlisted Origin and lists node auth headers", () => {
    const headers = occupancyPageCorsHeaders("https://world2.v0peer.org");
    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://world2.v0peer.org"
    );
    expect(headers["Access-Control-Allow-Headers"]).toMatch(/x-node-id/i);
    expect(headers["Access-Control-Allow-Headers"]).toMatch(/x-node-passw/i);
    expect(headers["Access-Control-Allow-Credentials"]).toBeUndefined();
    expect(headers["Vary"]).toBeUndefined();
  });

  it("does not echo a foreign Origin", () => {
    expect(occupancyPageCorsHeaders("https://evil.example")).toEqual({});
  });

  it("merges Origin into an existing Vary list without duplicating it", () => {
    expect(mergeVaryOrigin(null)).toBe("Origin");
    expect(mergeVaryOrigin("rsc, next-router-state-tree")).toBe(
      "rsc, next-router-state-tree, Origin"
    );
    expect(mergeVaryOrigin("Origin, Accept-Encoding")).toBe(
      "Origin, Accept-Encoding"
    );
  });

  it("applies CORS and preserves upstream Vary while adding Origin", () => {
    const headers = new Headers();
    headers.set("Vary", "rsc, next-router-state-tree");
    applyOccupancyPageCorsHeaders({
      headers,
      originHeader: "https://world2.v0peer.org",
    });
    expect(headers.get("Access-Control-Allow-Origin")).toBe(
      "https://world2.v0peer.org"
    );
    expect(headers.get("Vary")).toBe("rsc, next-router-state-tree, Origin");
  });
});
