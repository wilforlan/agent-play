import { describe, expect, it } from "vitest";
import { tokenizeAql } from "./aql-lexer";
import { parseAql } from "./aql-parser";
import { validateAql } from "./aql-validator";
import { executeAqlProgram } from "./aql-executor";
import type { AqlExecutionState } from "./aql-types";

describe("AQL lexer/parser/validator", () => {
  it("parses INSPECT/USE/SHIFT agent-node syntax", () => {
    const source = `INSPECT MAIN NODE
USE AGENT NODE $target
SHIFT AGENT NODE $next
INSPECT AGENT NODE
INSPECT AGENT`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.program.statements.map((s) => s.kind)).toEqual([
      "InspectMainNodeStmt",
      "UseAgentNodeStmt",
      "ShiftAgentNodeStmt",
      "InspectAgentNodeStmt",
      "InspectAgentStmt",
    ]);
  });

  it("supports dotted variable access for agent fields", () => {
    const source = `SHOW $agent.name`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    const showStmt = parsed.program.statements[0];
    expect(showStmt?.kind).toBe("ShowStmt");
  });

  it("rejects REGISTER keyword", () => {
    const source = `REGISTER AGENT $aid MAIN_NODE $main NAME "n" INSTRUCTIONS "i" TOOLS "chat_tool"`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
  });

  it("parses USE PLATFORM KEY", () => {
    const parsed = parseAql(tokenizeAql(`USE PLATFORM KEY "k1"`));
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.program.statements[0]?.kind).toBe("UsePlatformKeyStmt");
  });

  it("parses REMOVE SPACE NODE with optional FORCE", () => {
    const parsed = parseAql(
      tokenizeAql(`REMOVE SPACE NODE "node:abc"\nREMOVE SPACE NODE "node:def" FORCE`)
    );
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.program.statements[0]?.kind).toBe("RemoveSpaceNodeStmt");
    expect(parsed.program.statements[1]?.kind).toBe("RemoveSpaceNodeStmt");
    if (parsed.program.statements[1]?.kind === "RemoveSpaceNodeStmt") {
      expect(parsed.program.statements[1].force).toBe(true);
    }
  });

  it("requires USE PLATFORM KEY before REMOVE SPACE NODE", () => {
    const parsed = parseAql(tokenizeAql(`REMOVE SPACE NODE "node:abc"`));
    expect(parsed.diagnostics).toHaveLength(0);
    const validated = validateAql(parsed.program);
    expect(validated.diagnostics.length).toBeGreaterThan(0);
    expect(validated.diagnostics[0]?.message).toContain("USE PLATFORM KEY");
  });

  it("parses CREATE SPACE, USE SPACE NODE, amenities, and REMOVE", () => {
    const phrase = "one two three four five six seven eight nine ten";
    const source = `CREATE SPACE "n" DESIGN "d" OWNER "o" DESCRIPTION "x" STRUCTURE "sn"
USE SPACE NODE "nid" PASSPHRASE "${phrase}"
ADD AMENITY "shop"
INSPECT SPACE
INSPECT AMENITY "shop"
INSPECT AMENITY
REMOVE AMENITY "space-id" "shop"
REMOVE SPACE "space-id"`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.program.statements.map((s) => s.kind)).toEqual([
      "CreateSpaceStmt",
      "UseSpaceNodeStmt",
      "AddSpaceAmenityStmt",
      "InspectSpaceStmt",
      "InspectAmenityStmt",
      "InspectAmenityStmt",
      "RemoveSpaceAmenityStmt",
      "RemoveSpaceStmt",
    ]);
  });

  it("rejects CREATE LEASE AMENITY as unsupported", () => {
    const phrase = "one two three four five six seven eight nine ten";
    const source = `USE SPACE NODE "nid" PASSPHRASE "${phrase}"
CREATE LEASE AMENITY "shop" EMAIL "e@x.co" ADDRESS "a" MONTHS 6`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
  });

  it("parses macros and variables", () => {
    const source = `LET agent = "node-1"
MACRO ask(target, msg = "ping") {
  USE AGENT NODE $target
  SEND $msg
}
CALL ask($agent)`;
    const tokens = tokenizeAql(source);
    const parsed = parseAql(tokens);
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.program.statements.length).toBe(3);
    const validated = validateAql(parsed.program);
    expect(validated.diagnostics).toHaveLength(0);
  });
});

describe("AQL executor", () => {
  it("executes connect/use-agent-node/send and returns response", async () => {
    const source = `LET server = "http://localhost:3000"
LET main = "main-1"
LET node = "node-1"
CONNECT SERVER $server MAIN_NODE $main
USE AGENT NODE $node
WITH HEADER "x-debug" = "1"
SEND "hello"
SHOW RESPONSE`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);

    const state: AqlExecutionState = {
      serverUrl: "http://localhost:3000",
      mainNodeId: "",
      sid: null,
      nodePasswordMaterial: null,
      spaceCatalogId: null,
      spaceNodeId: null,
      spacePasswordMaterial: null,
      targetAmenityKind: null,
      targetAgentId: null,
      targetNodeId: null,
      timeoutMs: 8000,
      headers: {},
      platformServiceKey: null,
    };

    const runtimeClient = {
      ensureSession: async () => ({ sid: "sid-1" }),
      inspectMainNode: async () => ({ mainNode: { nodeId: "main-1" } }),
      sdkRpc: async () => ({ ok: true }),
      fetchSnapshot: async () => ({
        snapshot: { worldMap: { occupants: [{ kind: "agent", nodeId: "node-1", agentId: "agent-1" }] } },
      }),
      fetchSessionDetails: async () => ({ meta: { ok: true } }),
      sendIntercomCommand: async () => ({ ok: true, queued: true }),
    };

    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient,
      initialState: state,
    });
    expect(result.diagnostics).toHaveLength(0);
    expect(result.state.sid).toBe("sid-1");
    expect(result.state.targetNodeId).toBe("node-1");
    expect(result.state.targetAgentId).toBe("agent-1");
    expect(result.response).toEqual({ ok: true, queued: true });
  });

  it("CONNECT skips ensureSession when sid already set", async () => {
    const source = `CONNECT SERVER $server MAIN_NODE $main`;
    const parsed = parseAql(
      tokenizeAql(`LET server = "http://localhost:3000"\nLET main = "m1"\n${source}`)
    );
    expect(parsed.diagnostics).toHaveLength(0);
    let sessionCalls = 0;
    const runtimeClient = {
      ensureSession: async () => {
        sessionCalls += 1;
        return { sid: "should-not-run" };
      },
      inspectMainNode: async () => ({ mainNode: { nodeId: "m1" } }),
      sdkRpc: async () => ({ ok: true }),
      fetchSnapshot: async () => ({ snapshot: {} }),
      fetchSessionDetails: async () => ({ meta: {} }),
      sendIntercomCommand: async () => ({ ok: false }),
    };
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient,
      initialState: {
        serverUrl: "http://localhost:3000",
        mainNodeId: "",
        sid: "existing-sid",
        nodePasswordMaterial: null,
        spaceCatalogId: null,
        spaceNodeId: null,
        spacePasswordMaterial: null,
        targetAmenityKind: null,
        targetAgentId: null,
        targetNodeId: null,
        timeoutMs: 8000,
        headers: {},
        platformServiceKey: null,
      },
    });
    expect(result.diagnostics).toHaveLength(0);
    expect(sessionCalls).toBe(0);
    expect(result.state.sid).toBe("existing-sid");
  });

  it("INSPECT AGENT exposes $agent.* fields", async () => {
    const source = `LET n = "node-1"
USE AGENT NODE $n
INSPECT AGENT
SHOW $agent.name`;
    const parsed = parseAql(
      tokenizeAql(`CONNECT SERVER "http://localhost:3000" MAIN_NODE "main-1"\n${source}`)
    );
    expect(parsed.diagnostics).toHaveLength(0);
    const runtimeClient = {
      ensureSession: async () => ({ sid: "s1" }),
      inspectMainNode: async () => ({ mainNode: { nodeId: "main-1" } }),
      sdkRpc: async () => ({ ok: true }),
      fetchSnapshot: async () => ({
        snapshot: {
          worldMap: {
            occupants: [{ kind: "agent", nodeId: "node-1", agentId: "agent-1", name: "Scout" }],
          },
        },
      }),
      fetchSessionDetails: async () => ({ meta: {} }),
      sendIntercomCommand: async () => ({ ok: false }),
    };
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient,
      initialState: {
        serverUrl: "http://localhost:3000",
        mainNodeId: "",
        sid: "s",
        nodePasswordMaterial: "deadbeef",
        spaceCatalogId: null,
        spaceNodeId: null,
        spacePasswordMaterial: null,
        targetAmenityKind: null,
        targetAgentId: null,
        targetNodeId: null,
        timeoutMs: 8000,
        headers: {},
        platformServiceKey: null,
      },
    });
    expect(result.diagnostics).toHaveLength(0);
    expect(result.response).toBe("Scout");
  });

  it("SHIFT AGENT NODE requires existing context first", async () => {
    const source = `SHIFT AGENT NODE "node-2"`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    const runtimeClient = {
      ensureSession: async () => ({ sid: "sid-reg" }),
      inspectMainNode: async () => ({ mainNode: { nodeId: "main-1" } }),
      sdkRpc: async () => ({ ok: true }),
      fetchSnapshot: async () => ({ snapshot: { worldMap: { occupants: [] } } }),
      fetchSessionDetails: async () => ({ meta: {} }),
      sendIntercomCommand: async () => ({ ok: false }),
    };

    const state: AqlExecutionState = {
      serverUrl: "http://localhost:3000",
      mainNodeId: "",
      sid: "sid-ready",
      nodePasswordMaterial: null,
      spaceCatalogId: null,
      spaceNodeId: null,
      spacePasswordMaterial: null,
      targetAmenityKind: null,
      targetAgentId: null,
      targetNodeId: null,
      timeoutMs: 8000,
      headers: {},
      platformServiceKey: null,
    };

    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient,
      initialState: state,
    });
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]?.message).toContain("USE AGENT NODE before SHIFT AGENT NODE");
  });

  it("INSPECT MAIN NODE reads redis-backed node payload", async () => {
    const source = `CONNECT SERVER "http://localhost:3000" MAIN_NODE "main-1"
INSPECT MAIN NODE
SHOW $mainNode.mainNode.nodeId`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    const runtimeClient = {
      ensureSession: async () => ({ sid: "sid-1" }),
      inspectMainNode: async () => ({
        genesisNodeId: "root-1",
        mainNode: { nodeId: "main-1", kind: "main" },
        agentNodes: [],
      }),
      sdkRpc: async () => ({ ok: true }),
      fetchSnapshot: async () => ({ snapshot: { worldMap: { occupants: [] } } }),
      fetchSessionDetails: async () => ({ meta: {} }),
      sendIntercomCommand: async () => ({ ok: false }),
    };
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient,
      initialState: {
        serverUrl: "http://localhost:3000",
        mainNodeId: "",
        sid: null,
        nodePasswordMaterial: "material-1",
        spaceCatalogId: null,
        spaceNodeId: null,
        spacePasswordMaterial: null,
        targetAmenityKind: null,
        targetAgentId: null,
        targetNodeId: null,
        timeoutMs: 8000,
        headers: {},
        platformServiceKey: null,
      },
    });
    expect(result.diagnostics).toHaveLength(0);
    expect(result.response).toBe("main-1");
  });

  it("USE SPACE NODE binds catalog id and INSPECT SPACE calls sdkRpc", async () => {
    const phrase = "one two three four five six seven eight nine ten";
    const source = `USE SPACE NODE "sn1" PASSPHRASE "${phrase}"
INSPECT SPACE`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    let sdkCalls = 0;
    const runtimeClient = {
      ensureSession: async () => ({ sid: "new" }),
      inspectMainNode: async () => ({
        genesisNodeId: "g",
        mainNode: { nodeId: "sn1", kind: "space", spaceId: "catalog-1" },
        agentNodes: [],
      }),
      sdkRpc: async (input: { op: string; payload: Record<string, unknown> }) => {
        sdkCalls += 1;
        expect(input.op).toBe("inspectSpace");
        expect(input.payload).toEqual({ spaceId: "catalog-1" });
        return { catalog: null, logs: [] };
      },
      fetchSnapshot: async () => ({ snapshot: {} }),
      fetchSessionDetails: async () => ({ meta: {} }),
      sendIntercomCommand: async () => ({ ok: false }),
    };
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient,
      initialState: {
        serverUrl: "http://localhost:3000",
        mainNodeId: "",
        sid: "sid-x",
        nodePasswordMaterial: null,
        spaceCatalogId: null,
        spaceNodeId: null,
        spacePasswordMaterial: null,
        targetAmenityKind: null,
        targetAgentId: null,
        targetNodeId: null,
        timeoutMs: 8000,
        headers: {},
        platformServiceKey: null,
      },
    });
    expect(result.diagnostics).toHaveLength(0);
    expect(sdkCalls).toBe(1);
    expect(result.state.spaceCatalogId).toBe("catalog-1");
  });

  it("USE PLATFORM KEY sends x-agent-service-key on subsequent sdkRpc", async () => {
    const phrase = "one two three four five six seven eight nine ten";
    const source = `USE PLATFORM KEY "plat-secret-16b"
USE SPACE NODE "sn1" PASSPHRASE "${phrase}"
INSPECT SPACE`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    let lastHeaders: Record<string, string> = {};
    const runtimeClient = {
      ensureSession: async () => ({ sid: "new" }),
      inspectMainNode: async () => ({
        genesisNodeId: "g",
        mainNode: { nodeId: "sn1", kind: "space", spaceId: "catalog-1" },
        agentNodes: [],
      }),
      sdkRpc: async (input: { extraHeaders?: Record<string, string> }) => {
        lastHeaders = input.extraHeaders ?? {};
        return { catalog: null, logs: [] };
      },
      fetchSnapshot: async () => ({ snapshot: {} }),
      fetchSessionDetails: async () => ({ meta: {} }),
      sendIntercomCommand: async () => ({ ok: false }),
    };
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient,
      initialState: {
        serverUrl: "http://localhost:3000",
        mainNodeId: "",
        sid: "sid-x",
        nodePasswordMaterial: null,
        spaceCatalogId: null,
        spaceNodeId: null,
        spacePasswordMaterial: null,
        targetAmenityKind: null,
        targetAgentId: null,
        targetNodeId: null,
        timeoutMs: 8000,
        headers: {},
        platformServiceKey: null,
      },
    });
    expect(result.diagnostics).toHaveLength(0);
    expect(lastHeaders["x-agent-service-key"]).toBe("plat-secret-16b");
    expect(result.state.platformServiceKey).toBe("plat-secret-16b");
  });

  it("REMOVE SPACE NODE calls removeSpaceNode with platform key header", async () => {
    const source = `USE PLATFORM KEY "plat-secret-16b"
REMOVE SPACE NODE "node:space-1" FORCE`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    const validated = validateAql(parsed.program);
    expect(validated.diagnostics).toHaveLength(0);
    let lastRpc: { op: string; payload: Record<string, unknown>; extraHeaders?: Record<string, string> } | null =
      null;
    const runtimeClient = {
      ensureSession: async () => ({ sid: "s1" }),
      inspectMainNode: async () => ({ mainNode: { nodeId: "main-1" } }),
      sdkRpc: async (input: {
        op: string;
        payload: Record<string, unknown>;
        extraHeaders?: Record<string, string>;
      }) => {
        lastRpc = input;
        return { ok: true, nodeId: "node:space-1", spaceId: "catalog-1" };
      },
      fetchSnapshot: async () => ({ snapshot: {} }),
      fetchSessionDetails: async () => ({ meta: {} }),
      sendIntercomCommand: async () => ({ ok: false }),
    };
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient,
      initialState: {
        serverUrl: "http://localhost:3000",
        mainNodeId: "",
        sid: "sid-x",
        nodePasswordMaterial: null,
        spaceCatalogId: "catalog-1",
        spaceNodeId: "node:space-1",
        spacePasswordMaterial: "pass",
        targetAmenityKind: null,
        targetAgentId: null,
        targetNodeId: null,
        timeoutMs: 8000,
        headers: {},
        platformServiceKey: null,
      },
    });
    expect(result.diagnostics).toHaveLength(0);
    expect(lastRpc?.op).toBe("removeSpaceNode");
    expect(lastRpc?.payload).toEqual({ nodeId: "node:space-1", force: true });
    expect(lastRpc?.extraHeaders?.["x-agent-service-key"]).toBe("plat-secret-16b");
    expect(result.state.spaceCatalogId).toBeNull();
    expect(result.state.spaceNodeId).toBeNull();
  });

  it("REMOVE SPACE NODE fails at runtime without USE PLATFORM KEY", async () => {
    const parsed = parseAql(tokenizeAql(`REMOVE SPACE NODE "node:abc"`));
    const runtimeClient = {
      ensureSession: async () => ({ sid: "s1" }),
      inspectMainNode: async () => ({ mainNode: { nodeId: "main-1" } }),
      sdkRpc: async () => ({ ok: true }),
      fetchSnapshot: async () => ({ snapshot: {} }),
      fetchSessionDetails: async () => ({ meta: {} }),
      sendIntercomCommand: async () => ({ ok: false }),
    };
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient,
      initialState: {
        serverUrl: "http://localhost:3000",
        mainNodeId: "",
        sid: "sid-x",
        nodePasswordMaterial: null,
        spaceCatalogId: null,
        spaceNodeId: null,
        spacePasswordMaterial: null,
        targetAmenityKind: null,
        targetAgentId: null,
        targetNodeId: null,
        timeoutMs: 8000,
        headers: {},
        platformServiceKey: null,
      },
    });
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]?.message).toContain("USE PLATFORM KEY");
  });

  it("binds INTO names to variables for dotted field access", async () => {
    const phrase = "one two three four five six seven eight nine ten";
    const source = `CREATE SPACE "Bravo Towers" DESIGN "car-wash-v1" OWNER "Marcus Holloway"
INTO bravoTowers
SHOW $bravoTowers.nodeId`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    const runtimeClient = {
      ensureSession: async () => ({ sid: "sid-1" }),
      inspectMainNode: async () => ({ mainNode: { nodeId: "main-1" } }),
      sdkRpc: async () => ({
        spaceId: "space-1",
        nodeId: "node:abc123",
        phrase,
        structure: { id: "st-space-1" },
      }),
      fetchSnapshot: async () => ({ snapshot: { worldMap: { occupants: [] } } }),
      fetchSessionDetails: async () => ({ meta: {} }),
      sendIntercomCommand: async () => ({ ok: false }),
    };
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient,
      initialState: {
        serverUrl: "http://localhost:3000",
        mainNodeId: "main-1",
        sid: "sid-1",
        nodePasswordMaterial: "deadbeef",
        spaceCatalogId: null,
        spaceNodeId: null,
        spacePasswordMaterial: null,
        targetAmenityKind: null,
        targetAgentId: null,
        targetNodeId: null,
        timeoutMs: 8000,
        headers: {},
        platformServiceKey: null,
      },
    });
    expect(result.diagnostics).toHaveLength(0);
    expect(result.response).toBe("node:abc123");
  });
});
