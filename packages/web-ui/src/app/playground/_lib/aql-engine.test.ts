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
      targetAgentId: null,
      targetNodeId: null,
      timeoutMs: 8000,
      headers: {},
    };

    const runtimeClient = {
      ensureSession: async () => ({ sid: "sid-1" }),
      inspectMainNode: async () => ({ mainNode: { nodeId: "main-1" } }),
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
        targetAgentId: null,
        targetNodeId: null,
        timeoutMs: 8000,
        headers: {},
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
        targetAgentId: null,
        targetNodeId: null,
        timeoutMs: 8000,
        headers: {},
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
      fetchSnapshot: async () => ({ snapshot: { worldMap: { occupants: [] } } }),
      fetchSessionDetails: async () => ({ meta: {} }),
      sendIntercomCommand: async () => ({ ok: false }),
    };

    const state: AqlExecutionState = {
      serverUrl: "http://localhost:3000",
      mainNodeId: "",
      sid: "sid-ready",
      nodePasswordMaterial: null,
      targetAgentId: null,
      targetNodeId: null,
      timeoutMs: 8000,
      headers: {},
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
        targetAgentId: null,
        targetNodeId: null,
        timeoutMs: 8000,
        headers: {},
      },
    });
    expect(result.diagnostics).toHaveLength(0);
    expect(result.response).toBe("main-1");
  });
});
