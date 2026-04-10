import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadAgentPlayCredentialsFileFromPath,
  loadAgentPlayCredentialsFileFromPathSync,
  parseAgentPlayCredentialsJson,
} from "./agent-play-credentials.js";

describe("parseAgentPlayCredentialsJson", () => {
  it("parses main credentials and agentNodes", () => {
    const parsed = parseAgentPlayCredentialsJson({
      serverUrl: "http://127.0.0.1:3000/",
      nodeId: "abc",
      passw: "human phrase",
      agentNodes: [
        { nodeId: "agent-1", passw: "agent phrase", createdAt: "2026-01-01" },
      ],
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.serverUrl).toBe("http://127.0.0.1:3000");
    expect(parsed?.nodeId).toBe("abc");
    expect(parsed?.passw).toBe("human phrase");
    expect(parsed?.agentNodes).toHaveLength(1);
    expect(parsed?.agentNodes?.[0]?.nodeId).toBe("agent-1");
  });

  it("returns null for invalid json shape", () => {
    expect(parseAgentPlayCredentialsJson(null)).toBeNull();
    expect(parseAgentPlayCredentialsJson({})).toBeNull();
    expect(
      parseAgentPlayCredentialsJson({
        serverUrl: "x",
        nodeId: "y",
      })
    ).toBeNull();
  });
});

describe("loadAgentPlayCredentialsFileFromPath", () => {
  it("loads and parses a file (async)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ap-cred-"));
    const p = join(dir, "credentials.json");
    writeFileSync(
      p,
      JSON.stringify({
        serverUrl: "http://127.0.0.1:3000",
        nodeId: "nid",
        passw: "p",
      }),
      "utf8"
    );
    const c = await loadAgentPlayCredentialsFileFromPath(p);
    expect(c?.nodeId).toBe("nid");
  });

  it("loads and parses a file (sync)", () => {
    const dir = mkdtempSync(join(tmpdir(), "ap-cred-"));
    const p = join(dir, "credentials.json");
    writeFileSync(
      p,
      JSON.stringify({
        serverUrl: "http://127.0.0.1:3000",
        nodeId: "nid2",
        passw: "p",
      }),
      "utf8"
    );
    const c = loadAgentPlayCredentialsFileFromPathSync(p);
    expect(c?.nodeId).toBe("nid2");
  });

  it("returns null when file missing", async () => {
    const c = await loadAgentPlayCredentialsFileFromPath(
      join(tmpdir(), "missing-agent-play-cred.json")
    );
    expect(c).toBeNull();
  });
});
