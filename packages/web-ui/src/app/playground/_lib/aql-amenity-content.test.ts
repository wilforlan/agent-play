import { describe, expect, it, vi } from "vitest";
import { tokenizeAql } from "./aql-lexer";
import { parseAql } from "./aql-parser";
import { validateAql } from "./aql-validator";
import { executeAqlProgram } from "./aql-executor";
import type { AqlExecutionState } from "./aql-types";

const PHRASE = "alpha bravo charlie delta echo foxtrot golf hotel india juliet";

const baseState = (): AqlExecutionState => ({
  serverUrl: "http://localhost:3000",
  mainNodeId: "main-1",
  sid: null,
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
  });

const buildRuntimeMock = (): {
  rpc: ReturnType<typeof vi.fn>;
  client: Parameters<typeof executeAqlProgram>[0]["runtimeClient"];
} => {
  const sdkRpc = vi.fn(async () => ({ ok: true }));
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

describe("AQL — ADD SHOP/SUPERMARKET/CARWASH parsing", () => {
  it("parses ADD SHOP ITEM with all required fields", () => {
    const source = `ADD SHOP ITEM TYPE "book" NAME "Hitchhiker" DESCRIPTION "great" PRICE 12.5`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.program.statements[0]?.kind).toBe("AddShopItemStmt");
  });

  it("parses ADD SUPERMARKET ITEM with optional COLUMN", () => {
    const source = `ADD SUPERMARKET ITEM ROW 1 NAME "Apple" DESCRIPTION "fresh" PRICE 1.25 COLUMN 3`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.program.statements[0]?.kind).toBe("AddSupermarketItemStmt");
  });

  it("parses ADD CARWASH CAR with optional SLOT", () => {
    const source = `ADD CARWASH CAR SLOT 3 NAME "Mustang" MODEL "GT" YEAR 2024 PRICE 45000 COLOR "#ff0000"`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.program.statements[0]?.kind).toBe("AddCarWashCarStmt");
  });

  it("parses ADD CARWASH CAR without SLOT", () => {
    const source = `ADD CARWASH CAR NAME "Mustang" MODEL "GT" YEAR 2024 PRICE 45000 COLOR "#ff0000"`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
  });

  it("parses SET WALLET PLAYER and INSPECT WALLET", () => {
    const source = `SET WALLET PLAYER "p1" BALANCE 50
INSPECT WALLET "p1"`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.program.statements.map((s) => s.kind)).toEqual([
      "SetWalletStmt",
      "InspectWalletStmt",
    ]);
  });

  it("parses language-reference wallet syntax (OF PLAYER, BALANCE before id)", () => {
    const source = `SET WALLET BALANCE OF PLAYER "player-42" 100
INSPECT WALLET OF PLAYER "player-42"`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    expect(parsed.program.statements.map((s) => s.kind)).toEqual([
      "SetWalletStmt",
      "InspectWalletStmt",
    ]);
  });
});

describe("AQL — validator", () => {
  it("ADD SHOP ITEM requires USE SPACE NODE first", () => {
    const source = `ADD SHOP ITEM TYPE "book" NAME "n" DESCRIPTION "d" PRICE 1`;
    const parsed = parseAql(tokenizeAql(source));
    const validated = validateAql(parsed.program);
    expect(validated.diagnostics.length).toBeGreaterThan(0);
    expect(validated.diagnostics[0]?.message).toContain("USE SPACE NODE");
  });

  it("ADD SHOP ITEM passes after USE SPACE NODE", () => {
    const source = `USE SPACE NODE "n" PASSPHRASE "${PHRASE}"
ADD SHOP ITEM TYPE "book" NAME "n" DESCRIPTION "d" PRICE 1`;
    const parsed = parseAql(tokenizeAql(source));
    const validated = validateAql(parsed.program);
    expect(validated.diagnostics).toHaveLength(0);
  });
});

describe("AQL — executor dispatches to RPC", () => {
  it("ADD SHOP ITEM calls sdkRpc op=addShopItem with the space context", async () => {
    const source = `USE SPACE NODE "nid" PASSPHRASE "${PHRASE}"
ADD SHOP ITEM TYPE "book" NAME "Hitchhiker" DESCRIPTION "Don't Panic" PRICE 12.5`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    const { rpc, client } = buildRuntimeMock();
    const state = baseState();
    state.sid = "s1";
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient: client,
      initialState: state,
    });
    expect(result.diagnostics).toHaveLength(0);
    const addCalls = rpc.mock.calls.filter(
      (c) => (c[0] as { op: string }).op === "addShopItem"
    );
    expect(addCalls.length).toBe(1);
    const args = addCalls[0]?.[0] as {
      op: string;
      payload: Record<string, unknown>;
    };
    expect(args.payload).toMatchObject({
      spaceId: "space-1",
      type: "book",
      name: "Hitchhiker",
      description: "Don't Panic",
      priceUsd: 12.5,
    });
  });

  it("ADD CARWASH CAR forwards SLOT, YEAR and COLOR", async () => {
    const source = `USE SPACE NODE "nid" PASSPHRASE "${PHRASE}"
ADD CARWASH CAR SLOT 7 NAME "Mustang" MODEL "GT" YEAR 2024 PRICE 45000 COLOR "#ff3344"`;
    const parsed = parseAql(tokenizeAql(source));
    expect(parsed.diagnostics).toHaveLength(0);
    const { rpc, client } = buildRuntimeMock();
    const state = baseState();
    state.sid = "s1";
    const result = await executeAqlProgram({
      program: parsed.program,
      runtimeClient: client,
      initialState: state,
    });
    expect(result.diagnostics).toHaveLength(0);
    const addCalls = rpc.mock.calls.filter(
      (c) => (c[0] as { op: string }).op === "addCarWashCar"
    );
    expect(addCalls.length).toBe(1);
    const args = addCalls[0]?.[0] as {
      op: string;
      payload: Record<string, unknown>;
    };
    expect(args.payload).toMatchObject({
      spaceId: "space-1",
      slot: 7,
      name: "Mustang",
      model: "GT",
      year: 2024,
      priceUsd: 45000,
      colorHex: "#ff3344",
    });
  });
});
