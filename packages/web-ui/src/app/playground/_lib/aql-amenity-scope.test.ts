import { describe, expect, it, vi } from "vitest";
import { tokenizeAql } from "./aql-lexer";
import { parseAql } from "./aql-parser";
import { validateAql } from "./aql-validator";
import { executeAqlProgram } from "./aql-executor";
import type {
  AqlExecutionState,
  AqlStatement,
} from "./aql-types";

const PHRASE = "alpha bravo charlie delta echo foxtrot golf hotel india juliet";

const baseState = (): AqlExecutionState => ({
  serverUrl: "http://localhost:3000",
  mainNodeId: "main-1",
  sid: "s1",
  nodePasswordMaterial: "deadbeef",
  spaceCatalogId: null,
  spaceNodeId: null,
  spacePasswordMaterial: null,
  targetAmenityKind: null,
  targetAgentId: null,
  targetNodeId: null,
  timeoutMs: 8000,
  headers: {},
});

const buildRuntimeMock = (): {
  rpc: ReturnType<typeof vi.fn>;
  client: Parameters<typeof executeAqlProgram>[0]["runtimeClient"];
} => {
  const sdkRpc = vi.fn(async (args: { op: string }) => {
    if (args.op === "inspectAmenity") {
      return {
        kind: "shop",
        items: [{ id: "shop-1" }],
        logs: [],
        leases: [],
      };
    }
    if (args.op === "removeAmenityItems") {
      return { removed: ["shop-1"], requested: 1 };
    }
    return { ok: true };
  });
  const client: Parameters<typeof executeAqlProgram>[0]["runtimeClient"] = {
    ensureSession: async () => ({ sid: "s1" }),
    inspectMainNode: async () => ({
      mainNode: { nodeId: "node-1", kind: "space", spaceId: "space-1" },
    }),
    sdkRpc,
    fetchSnapshot: async () => ({ snapshot: { worldMap: { occupants: [] } } }),
    fetchSessionDetails: async () => ({ meta: {} }),
    sendIntercomCommand: async () => ({ ok: false }),
  };
  return { rpc: sdkRpc, client };
};

describe("AQL — USE AMENITY parsing", () => {
  it("parses USE AMENITY <kind>", () => {
    const source = `USE AMENITY "shop"`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.program.statements[0]?.kind).toBe("UseAmenityStmt");
    const stmt = parsed.program.statements[0] as Extract<
      AqlStatement,
      { kind: "UseAmenityStmt" }
    >;
    expect(stmt.amenityKind).toEqual({ kind: "StringLiteral", value: "shop" });
  });
});

describe("AQL — REMOVE AMENITY ITEMS parsing", () => {
  it("parses REMOVE AMENITY ITEMS ALL", () => {
    const source = `REMOVE AMENITY ITEMS ALL`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.program.statements[0]?.kind).toBe("RemoveAmenityItemsStmt");
    const stmt = parsed.program.statements[0] as Extract<
      AqlStatement,
      { kind: "RemoveAmenityItemsStmt" }
    >;
    expect(stmt.all).toBe(true);
    expect(stmt.itemIds).toBeUndefined();
  });

  it("parses REMOVE AMENITY ITEMS with a single id", () => {
    const source = `REMOVE AMENITY ITEMS "shop-1"`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    const stmt = parsed.program.statements[0] as Extract<
      AqlStatement,
      { kind: "RemoveAmenityItemsStmt" }
    >;
    expect(stmt.all).toBe(false);
    expect(stmt.itemIds).toHaveLength(1);
    expect(stmt.itemIds?.[0]).toEqual({
      kind: "StringLiteral",
      value: "shop-1",
    });
  });

  it("parses REMOVE AMENITY ITEMS with comma-separated ids", () => {
    const source = `REMOVE AMENITY ITEMS "shop-1", "shop-2", "shop-3"`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    const stmt = parsed.program.statements[0] as Extract<
      AqlStatement,
      { kind: "RemoveAmenityItemsStmt" }
    >;
    expect(stmt.all).toBe(false);
    expect(stmt.itemIds?.map((expr) => (expr as { value: string }).value)).toEqual([
      "shop-1",
      "shop-2",
      "shop-3",
    ]);
  });

  it("still parses REMOVE AMENITY <spaceId> <kind> for back-compat", () => {
    const source = `REMOVE AMENITY "space-1" "shop"`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.program.statements[0]?.kind).toBe("RemoveSpaceAmenityStmt");
  });
});

describe("AQL — validator for amenity scope", () => {
  it("USE AMENITY requires USE SPACE NODE first", () => {
    const source = `USE AMENITY "shop"`;
    const parsed = parseAql(tokenizeAql(source));
    const validated = validateAql(parsed.program);
    expect(validated.diagnostics.length).toBeGreaterThan(0);
    expect(validated.diagnostics[0]?.message).toContain("USE SPACE NODE");
  });

  it("USE AMENITY passes after USE SPACE NODE", () => {
    const source = `USE SPACE NODE "n" PASSPHRASE "${PHRASE}"
USE AMENITY "shop"`;
    const parsed = parseAql(tokenizeAql(source));
    const validated = validateAql(parsed.program);
    expect(validated.diagnostics).toHaveLength(0);
  });

  it("REMOVE AMENITY ITEMS requires USE AMENITY scope", () => {
    const source = `USE SPACE NODE "n" PASSPHRASE "${PHRASE}"
REMOVE AMENITY ITEMS ALL`;
    const parsed = parseAql(tokenizeAql(source));
    const validated = validateAql(parsed.program);
    expect(validated.diagnostics.length).toBeGreaterThan(0);
    expect(validated.diagnostics[0]?.message).toContain("USE AMENITY");
  });

  it("REMOVE AMENITY ITEMS passes with USE SPACE NODE + USE AMENITY", () => {
    const source = `USE SPACE NODE "n" PASSPHRASE "${PHRASE}"
USE AMENITY "shop"
REMOVE AMENITY ITEMS ALL`;
    const parsed = parseAql(tokenizeAql(source));
    const validated = validateAql(parsed.program);
    expect(validated.diagnostics).toHaveLength(0);
  });
});

describe("AQL — executor scoping", () => {
  it("USE AMENITY sets targetAmenityKind on state", async () => {
    const source = `USE SPACE NODE "nid" PASSPHRASE "${PHRASE}"
USE AMENITY "supermarket"`;
    const parsed = parseAql(tokenizeAql(source));
    const { client } = buildRuntimeMock();
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient: client,
      initialState: baseState(),
    });
    expect(result.diagnostics).toHaveLength(0);
    expect(result.state.targetAmenityKind).toBe("supermarket");
  });

  it("USE AMENITY rejects unknown amenity kinds", async () => {
    const source = `USE SPACE NODE "nid" PASSPHRASE "${PHRASE}"
USE AMENITY "playground"`;
    const parsed = parseAql(tokenizeAql(source));
    const { client } = buildRuntimeMock();
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient: client,
      initialState: baseState(),
    });
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]?.message).toContain("amenity kind");
  });

  it("INSPECT AMENITY without an explicit kind uses the USE AMENITY scope", async () => {
    const source = `USE SPACE NODE "nid" PASSPHRASE "${PHRASE}"
USE AMENITY "shop"
INSPECT AMENITY`;
    const parsed = parseAql(tokenizeAql(source));
    const { rpc, client } = buildRuntimeMock();
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient: client,
      initialState: baseState(),
    });
    expect(result.diagnostics).toHaveLength(0);
    const inspectCalls = rpc.mock.calls.filter(
      (c) => (c[0] as { op: string }).op === "inspectAmenity"
    );
    expect(inspectCalls.length).toBe(1);
    const args = inspectCalls[0]?.[0] as {
      payload: Record<string, unknown>;
    };
    expect(args.payload).toMatchObject({ spaceId: "space-1", kind: "shop" });
  });

  it("REMOVE AMENITY ITEMS ALL calls removeAmenityItems with all=true", async () => {
    const source = `USE SPACE NODE "nid" PASSPHRASE "${PHRASE}"
USE AMENITY "shop"
REMOVE AMENITY ITEMS ALL`;
    const parsed = parseAql(tokenizeAql(source));
    const { rpc, client } = buildRuntimeMock();
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient: client,
      initialState: baseState(),
    });
    expect(result.diagnostics).toHaveLength(0);
    const removeCalls = rpc.mock.calls.filter(
      (c) => (c[0] as { op: string }).op === "removeAmenityItems"
    );
    expect(removeCalls.length).toBe(1);
    const args = removeCalls[0]?.[0] as {
      payload: Record<string, unknown>;
    };
    expect(args.payload).toMatchObject({
      spaceId: "space-1",
      kind: "shop",
      all: true,
    });
    expect(args.payload).not.toHaveProperty("itemIds");
  });

  it("REMOVE AMENITY ITEMS with ids forwards the array", async () => {
    const source = `USE SPACE NODE "nid" PASSPHRASE "${PHRASE}"
USE AMENITY "supermarket"
REMOVE AMENITY ITEMS "sm-1", "sm-2"`;
    const parsed = parseAql(tokenizeAql(source));
    const { rpc, client } = buildRuntimeMock();
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient: client,
      initialState: baseState(),
    });
    expect(result.diagnostics).toHaveLength(0);
    const removeCalls = rpc.mock.calls.filter(
      (c) => (c[0] as { op: string }).op === "removeAmenityItems"
    );
    expect(removeCalls.length).toBe(1);
    const args = removeCalls[0]?.[0] as {
      payload: Record<string, unknown>;
    };
    expect(args.payload).toMatchObject({
      spaceId: "space-1",
      kind: "supermarket",
      itemIds: ["sm-1", "sm-2"],
    });
    expect(args.payload).not.toHaveProperty("all");
  });
});
