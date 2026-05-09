import type {
  AqlDiagnostic,
  AqlExecutionOutput,
  AqlExecutionState,
  AqlExpr,
  AqlProgram,
  AqlStatement,
  AqlValue,
} from "./aql-types";
import type { PlaygroundRuntimeClient } from "./aql-runtime-client";

type MacroDef = Extract<AqlStatement, { kind: "MacroDefStmt" }>;

type ExecContext = {
  rpc: PlaygroundRuntimeClient;
  state: AqlExecutionState;
  vars: Map<string, AqlValue>;
  macros: Map<string, MacroDef>;
  outputs: {
    lastOutput: AqlExecutionOutput | null;
    named: Map<string, unknown>;
    lastResponse: unknown;
    lastHeaders: Record<string, string>;
  };
};

export type ExecuteResult = {
  diagnostics: AqlDiagnostic[];
  response: unknown;
  headers: Record<string, string>;
  state: AqlExecutionState;
};

function evalExpr(expr: AqlExpr, vars: Map<string, AqlValue>): AqlValue {
  switch (expr.kind) {
    case "StringLiteral":
      return expr.value;
    case "NumberLiteral":
      return expr.value;
    case "VarRef": {
      if (!expr.name.includes(".")) {
        const value = vars.get(expr.name);
        if (value === undefined) {
          throw new Error(`AQL_RUNTIME_ERROR: variable '${expr.name}' is not defined`);
        }
        return value;
      }
      const [root, ...segments] = expr.name.split(".");
      const initial = vars.get(root ?? "");
      if (initial === undefined) {
        throw new Error(`AQL_RUNTIME_ERROR: variable '${expr.name}' is not defined`);
      }
      let current: unknown = initial;
      for (const segment of segments) {
        if (
          typeof current !== "object" ||
          current === null ||
          !(segment in (current as Record<string, unknown>))
        ) {
          throw new Error(`AQL_RUNTIME_ERROR: variable '${expr.name}' is not defined`);
        }
        current = (current as Record<string, unknown>)[segment];
      }
      return current;
    }
  }
}

function nowRequestId(): string {
  return `aql-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function splitHttpMeta(input: Record<string, unknown>): {
  payload: Record<string, unknown>;
  headers: Record<string, string>;
} {
  const http = input.__http;
  const headers: Record<string, string> = {};
  if (typeof http === "object" && http !== null) {
    const rawHeaders = (http as { headers?: unknown }).headers;
    if (typeof rawHeaders === "object" && rawHeaders !== null) {
      for (const [key, value] of Object.entries(rawHeaders as Record<string, unknown>)) {
        if (typeof value === "string") {
          headers[key] = value;
        }
      }
    }
  }
  const payload: Record<string, unknown> = { ...input };
  delete payload.__http;
  return { payload, headers };
}

function getSnapshotOccupants(snapshot: Record<string, unknown>): Array<Record<string, unknown>> {
  const snapshotValue = snapshot.snapshot;
  if (typeof snapshotValue !== "object" || snapshotValue === null) return [];
  const worldMap = (snapshotValue as Record<string, unknown>).worldMap;
  if (typeof worldMap !== "object" || worldMap === null) return [];
  const occupants = (worldMap as Record<string, unknown>).occupants;
  if (!Array.isArray(occupants)) return [];
  return occupants.filter(
    (o): o is Record<string, unknown> => typeof o === "object" && o !== null
  );
}

function findOccupantByNodeId(
  snapshot: Record<string, unknown>,
  nodeId: string
): Record<string, unknown> | null {
  const occupants = getSnapshotOccupants(snapshot);
  for (const occupant of occupants) {
    if (typeof occupant.nodeId === "string" && occupant.nodeId === nodeId) {
      return occupant;
    }
  }
  return null;
}

function resolveAgentFromNode(
  snapshot: Record<string, unknown>,
  nodeId: string
): { node: Record<string, unknown>; agentId: string } {
  const node = findOccupantByNodeId(snapshot, nodeId);
  if (node === null) {
    throw new Error(`AQL_RUNTIME_ERROR: agent node '${nodeId}' not found`);
  }
  if (node.kind !== "agent") {
    throw new Error(`AQL_RUNTIME_ERROR: node '${nodeId}' is not an agent node`);
  }
  const agentId = node.agentId;
  if (typeof agentId !== "string" || agentId.length === 0) {
    throw new Error(`AQL_RUNTIME_ERROR: node '${nodeId}' is missing agentId`);
  }
  return { node, agentId };
}

async function execStatement(
  statement: AqlStatement,
  context: ExecContext
): Promise<void> {
  switch (statement.kind) {
    case "LetStmt": {
      context.vars.set(statement.name, evalExpr(statement.value, context.vars));
      return;
    }
    case "MacroDefStmt": {
      context.macros.set(statement.name, statement);
      return;
    }
    case "CallStmt": {
      const macro = context.macros.get(statement.name);
      if (macro === undefined) {
        throw new Error(`AQL_RUNTIME_ERROR: macro '${statement.name}' is not defined`);
      }
      const scopedVars = new Map(context.vars);
      for (let i = 0; i < macro.params.length; i += 1) {
        const param = macro.params[i];
        const arg = statement.args[i];
        if (arg !== undefined) {
          scopedVars.set(param.name, evalExpr(arg, context.vars));
          continue;
        }
        if (param.defaultValue !== undefined) {
          scopedVars.set(param.name, evalExpr(param.defaultValue, context.vars));
          continue;
        }
        throw new Error(
          `AQL_RUNTIME_ERROR: missing argument '${param.name}' for macro '${macro.name}'`
        );
      }
      const scopedContext: ExecContext = {
        ...context,
        vars: scopedVars,
      };
      for (const stmt of macro.body) {
        await execStatement(stmt, scopedContext);
      }
      context.state = scopedContext.state;
      context.outputs = scopedContext.outputs;
      return;
    }
    case "ConnectStmt": {
      const serverUrl = String(evalExpr(statement.serverUrl, context.vars));
      const mainNodeId = String(evalExpr(statement.mainNodeId, context.vars));
      context.state.serverUrl = serverUrl;
      context.state.mainNodeId = mainNodeId;
      if (context.state.sid !== null) {
        context.outputs.lastResponse = {
          sid: context.state.sid,
          connected: true,
          reusedSession: true,
        };
        context.outputs.lastHeaders = {};
        return;
      }
      const { sid } = await context.rpc.ensureSession();
      context.state.sid = sid;
      context.outputs.lastResponse = { sid, connected: true };
      context.outputs.lastHeaders = {};
      return;
    }
    case "InspectMainNodeStmt": {
      const nodeId = context.state.mainNodeId.trim();
      if (nodeId.length === 0) {
        throw new Error("AQL_RUNTIME_ERROR: main node is not set; run CONNECT first");
      }
      const passwordMaterial = context.state.nodePasswordMaterial;
      if (passwordMaterial === null || passwordMaterial.length === 0) {
        throw new Error(
          "AQL_RUNTIME_ERROR: main-node passphrase material is missing; use the Connect form first"
        );
      }
      const startedAt = performance.now();
      const rawNode = await context.rpc.inspectMainNode({
        nodeId,
        passwordMaterial,
      });
      const { payload: node, headers } = splitHttpMeta(rawNode);
      const timingMs = Math.round(performance.now() - startedAt);
      context.vars.set("mainNode", node);
      context.outputs.lastOutput = {
        response: node,
        headers,
        status: 200,
        timingMs,
      };
      context.outputs.lastResponse = node;
      context.outputs.lastHeaders = headers;
      return;
    }
    case "InspectAgentNodeStmt": {
      const sid = context.state.sid;
      if (sid === null) {
        throw new Error("AQL_RUNTIME_ERROR: run CONNECT before INSPECT AGENT NODE");
      }
      const nodeId = context.state.targetNodeId;
      if (nodeId === null) {
        throw new Error("AQL_RUNTIME_ERROR: run USE AGENT NODE before INSPECT AGENT NODE");
      }
      const startedAt = performance.now();
      const rawSnapshot = await context.rpc.fetchSnapshot({ sid });
      const { payload: snapshot, headers } = splitHttpMeta(rawSnapshot);
      const { node } = resolveAgentFromNode(snapshot, nodeId);
      const timingMs = Math.round(performance.now() - startedAt);
      context.vars.set("node", node);
      context.outputs.lastOutput = {
        response: node,
        headers,
        status: 200,
        timingMs,
      };
      context.outputs.lastResponse = node;
      context.outputs.lastHeaders = headers;
      return;
    }
    case "UseAgentNodeStmt":
    case "ShiftAgentNodeStmt": {
      const sid = context.state.sid;
      if (sid === null) {
        throw new Error("AQL_RUNTIME_ERROR: run CONNECT before USE AGENT NODE");
      }
      if (statement.kind === "ShiftAgentNodeStmt" && context.state.targetNodeId === null) {
        throw new Error("AQL_RUNTIME_ERROR: run USE AGENT NODE before SHIFT AGENT NODE");
      }
      const nodeId = String(evalExpr(statement.nodeId, context.vars));
      const snapshot = await context.rpc.fetchSnapshot({ sid });
      const { node, agentId } = resolveAgentFromNode(snapshot, nodeId);
      context.state.targetNodeId = nodeId;
      context.state.targetAgentId = agentId;
      context.vars.set("agent", node);
      context.outputs.lastResponse = {
        connectedAgentNode: nodeId,
        agentId,
        shifted: statement.kind === "ShiftAgentNodeStmt",
      };
      context.outputs.lastHeaders = {};
      return;
    }
    case "InspectAgentStmt": {
      const sid = context.state.sid;
      if (sid === null) {
        throw new Error("AQL_RUNTIME_ERROR: run CONNECT before INSPECT AGENT");
      }
      const nodeId = context.state.targetNodeId;
      if (nodeId === null) {
        throw new Error("AQL_RUNTIME_ERROR: run USE AGENT NODE before INSPECT AGENT");
      }
      const startedAt = performance.now();
      const snapshot = await context.rpc.fetchSnapshot({ sid });
      const { node } = resolveAgentFromNode(snapshot, nodeId);
      const timingMs = Math.round(performance.now() - startedAt);
      context.vars.set("agent", node);
      context.outputs.lastOutput = {
        response: node,
        headers: {},
        status: 200,
        timingMs,
      };
      context.outputs.lastResponse = node;
      context.outputs.lastHeaders = {};
      return;
    }
    case "WithHeaderStmt": {
      const key = String(evalExpr(statement.key, context.vars));
      const value = String(evalExpr(statement.value, context.vars));
      context.state.headers[key] = value;
      return;
    }
    case "WithTimeoutStmt": {
      const timeoutMs = Number(evalExpr(statement.timeoutMs, context.vars));
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new Error("AQL_RUNTIME_ERROR: invalid timeout");
      }
      context.state.timeoutMs = timeoutMs;
      return;
    }
    case "FetchStmt": {
      const sid = context.state.sid;
      if (sid === null) {
        throw new Error("AQL_RUNTIME_ERROR: run CONNECT before FETCH");
      }
      if (statement.target === "SNAPSHOT") {
        const startedAt = performance.now();
        const rawResponse = await context.rpc.fetchSnapshot({ sid });
        const { payload: response, headers } = splitHttpMeta(rawResponse);
        const timingMs = Math.round(performance.now() - startedAt);
        context.outputs.lastOutput = {
          response,
          headers,
          status: 200,
          timingMs,
        };
        context.outputs.lastResponse = response;
        context.outputs.lastHeaders = headers;
        return;
      }
      if (statement.target === "METADATA") {
        const startedAt = performance.now();
        const rawResponse = await context.rpc.fetchSessionDetails({ sid });
        const { payload: response, headers } = splitHttpMeta(rawResponse);
        const timingMs = Math.round(performance.now() - startedAt);
        context.outputs.lastOutput = {
          response,
          headers,
          status: 200,
          timingMs,
        };
        context.outputs.lastResponse = response;
        context.outputs.lastHeaders = headers;
        return;
      }
      if (statement.target === "OCCUPANTS") {
        const startedAt = performance.now();
        const rawSnapshot = await context.rpc.fetchSnapshot({ sid });
        const { payload: snapshot, headers } = splitHttpMeta(rawSnapshot);
        const snapshotValue = snapshot.snapshot;
        const occupants =
          typeof snapshotValue === "object" &&
          snapshotValue !== null &&
          "worldMap" in snapshotValue
            ? snapshotValue
            : { snapshot };
        const timingMs = Math.round(performance.now() - startedAt);
        context.outputs.lastOutput = {
          response: occupants,
          headers,
          status: 200,
          timingMs,
        };
        context.outputs.lastResponse = occupants;
        context.outputs.lastHeaders = headers;
        return;
      }
      return;
    }
    case "SendStmt": {
      const sid = context.state.sid;
      if (sid === null) {
        throw new Error("AQL_RUNTIME_ERROR: run CONNECT before SEND");
      }
      const toPlayerId = context.state.targetAgentId;
      if (toPlayerId === null) {
        throw new Error("AQL_RUNTIME_ERROR: run USE AGENT NODE before SEND");
      }
      const text = String(evalExpr(statement.message, context.vars));
      const startedAt = performance.now();
      const rawResponse = await context.rpc.sendIntercomCommand({
        sid,
        requestId: nowRequestId(),
        mainNodeId: context.state.mainNodeId,
        fromPlayerId: "__human__",
        toPlayerId,
        kind: "chat",
        text,
      });
      const { payload: response, headers } = splitHttpMeta(rawResponse);
      const timingMs = Math.round(performance.now() - startedAt);
      context.outputs.lastOutput = {
        response,
        headers,
        status: 200,
        timingMs,
      };
      context.outputs.lastResponse = response;
      context.outputs.lastHeaders = headers;
      return;
    }
    case "IntoStmt": {
      context.outputs.named.set(statement.name, context.outputs.lastResponse);
      return;
    }
    case "ShowStmt": {
      if (statement.target === "RESPONSE") {
        return;
      }
      if (statement.target === "HEADERS") {
        return;
      }
      context.outputs.lastResponse = evalExpr(statement.target, context.vars);
      return;
    }
    case "ReturnStmt": {
      context.outputs.lastResponse = evalExpr(statement.value, context.vars);
      return;
    }
  }
}

export async function executeAqlProgram(input: {
  program: AqlProgram;
  runtimeClient: PlaygroundRuntimeClient;
  initialState: AqlExecutionState;
}): Promise<ExecuteResult> {
  const diagnostics: AqlDiagnostic[] = [];
  const context: ExecContext = {
    rpc: input.runtimeClient,
    state: { ...input.initialState, headers: { ...input.initialState.headers } },
    vars: new Map(),
    macros: new Map(),
    outputs: {
      lastOutput: null,
      named: new Map(),
      lastResponse: null,
      lastHeaders: {},
    },
  };

  for (const statement of input.program.statements) {
    try {
      await execStatement(statement, context);
    } catch (error) {
      diagnostics.push({
        code: "AQL_RUNTIME_ERROR",
        severity: "error",
        line: 1,
        column: 1,
        message: error instanceof Error ? error.message : String(error),
      });
      break;
    }
  }

  return {
    diagnostics,
    response: context.outputs.lastResponse,
    headers: context.outputs.lastHeaders,
    state: context.state,
  };
}
