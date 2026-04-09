import { describe, expect, it } from "vitest";
import { toPublicMainNodeAuth } from "./public-node-auth.js";

describe("toPublicMainNodeAuth", () => {
  it("omits passw and passwHash and exposes agentNodeIds", () => {
    const out = toPublicMainNodeAuth({
      nodeId: "main-1",
      kind: "main",
      parentNodeId: "root",
      passw: "secret-hash",
      passwHash: "secret-hash",
      createdAt: "2020-01-01T00:00:00.000Z",
      agentNodeIds: ["a", "b"],
    });
    expect(out).toEqual({
      nodeId: "main-1",
      kind: "main",
      parentNodeId: "root",
      createdAt: "2020-01-01T00:00:00.000Z",
      agentNodeIds: ["a", "b"],
    });
    expect(out).not.toHaveProperty("passw");
    expect(out).not.toHaveProperty("passwHash");
  });

  it("defaults agentNodeIds to empty array", () => {
    const out = toPublicMainNodeAuth({
      nodeId: "main-1",
      kind: "main",
      createdAt: "2020-01-01T00:00:00.000Z",
    });
    expect(out.agentNodeIds).toEqual([]);
  });
});
