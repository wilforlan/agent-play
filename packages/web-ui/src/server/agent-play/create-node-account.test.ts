import { describe, expect, it } from "vitest";
import { InMemoryAgentRepository } from "./in-memory-agent-repository.js";
import {
  createNodeAccount,
  parseCreateNodeBody,
} from "./create-node-account.js";

describe("parseCreateNodeBody", () => {
  it("accepts a non-empty passw string", () => {
    const r = parseCreateNodeBody({ passw: "hello world phrase" });
    expect(r).toEqual({ ok: true, passw: "hello world phrase" });
  });

  it("rejects missing passw", () => {
    const r = parseCreateNodeBody({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/passw/);
  });
});

describe("createNodeAccount", () => {
  const rootKey = "fixture-root-key";

  it("registers a new node id for a unique passphrase", async () => {
    const repo = new InMemoryAgentRepository({ rootKey });
    const { nodeId } = await createNodeAccount(repo, "amber angle apple arch atlas");
    expect(nodeId.length).toBeGreaterThan(0);
    const row = await repo.getNode(nodeId);
    expect(row?.nodeId).toBe(nodeId);
  });

  it("rejects duplicate passphrase registration", async () => {
    const repo = new InMemoryAgentRepository({ rootKey });
    const passw = "amber angle apple arch atlas aura autumn bamboo beacon birch blossom";
    await createNodeAccount(repo, passw);
    await expect(createNodeAccount(repo, passw)).rejects.toThrow(
      /already exists/
    );
  });
});
