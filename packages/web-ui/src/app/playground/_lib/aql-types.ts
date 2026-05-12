/**
 * @packageDocumentation
 * @module @agent-play/web-ui/playground/aql-types
 *
 * Type definitions for AQL: tokens, expressions, statements, diagnostics, and
 * execution outputs. The {@link AqlStatement} union enumerates every AQL
 * command, including the 3.1.1 additions
 * `AddShopItemStmt | AddSupermarketItemStmt | AddCarWashCarStmt | SetWalletStmt`.
 *
 * @see ./aql-lexer.ts for token production.
 * @see ./aql-parser.ts for statement recognition.
 * @see ./aql-validator.ts for required-field / enum checks.
 * @see ./aql-executor.ts for RPC dispatch.
 */

export type AqlValue = unknown;

export type AqlTokenKind =
  | "keyword"
  | "identifier"
  | "variable"
  | "string"
  | "number"
  | "symbol";

export type AqlToken = {
  kind: AqlTokenKind;
  value: string;
  line: number;
  column: number;
};

export type AqlDiagnosticSeverity = "error" | "warning";

export type AqlDiagnostic = {
  code: string;
  message: string;
  severity: AqlDiagnosticSeverity;
  line: number;
  column: number;
};

export type AqlExpr =
  | { kind: "StringLiteral"; value: string }
  | { kind: "NumberLiteral"; value: number }
  | { kind: "VarRef"; name: string };

export type AqlStatement =
  | { kind: "LetStmt"; name: string; value: AqlExpr }
  | {
      kind: "ConnectStmt";
      serverUrl: AqlExpr;
      mainNodeId: AqlExpr;
    }
  | {
      kind: "CreateSpaceStmt";
      name: AqlExpr;
      designKey: AqlExpr;
      ownerDisplayName: AqlExpr;
      description?: AqlExpr;
      structureName?: AqlExpr;
    }
  | {
      kind: "CreateLeaseStmt";
      amenityKind: AqlExpr;
      email: AqlExpr;
      address: AqlExpr;
      durationMonths: AqlExpr;
      humanPlayerId?: AqlExpr;
    }
  | { kind: "InspectMainNodeStmt" }
  | { kind: "InspectSpaceStmt" }
  | {
      kind: "InspectAmenityStmt";
      kindFilter?: AqlExpr;
    }
  | { kind: "InspectAgentNodeStmt" }
  | { kind: "UseAgentNodeStmt"; nodeId: AqlExpr }
  | { kind: "UseSpaceNodeStmt"; nodeId: AqlExpr; passphrase: AqlExpr }
  | { kind: "ShiftAgentNodeStmt"; nodeId: AqlExpr }
  | { kind: "InspectAgentStmt" }
  | { kind: "AddSpaceAmenityStmt"; amenityKind: AqlExpr }
  | { kind: "RemoveSpaceAmenityStmt"; spaceId: AqlExpr; amenityKind: AqlExpr }
  | { kind: "RemoveSpaceStmt"; spaceId: AqlExpr }
  | {
      kind: "AddShopItemStmt";
      itemType: AqlExpr;
      name: AqlExpr;
      description: AqlExpr;
      priceUsd: AqlExpr;
    }
  | {
      kind: "AddSupermarketItemStmt";
      row: AqlExpr;
      name: AqlExpr;
      description: AqlExpr;
      priceUsd: AqlExpr;
      column?: AqlExpr;
    }
  | {
      kind: "AddCarWashCarStmt";
      slot?: AqlExpr;
      name: AqlExpr;
      model: AqlExpr;
      year: AqlExpr;
      priceUsd: AqlExpr;
      colorHex: AqlExpr;
    }
  | { kind: "SetWalletStmt"; playerId: AqlExpr; balanceUsd: AqlExpr }
  | { kind: "InspectWalletStmt"; playerId: AqlExpr }
  | { kind: "SendStmt"; message: AqlExpr }
  | { kind: "WithHeaderStmt"; key: AqlExpr; value: AqlExpr }
  | { kind: "WithTimeoutStmt"; timeoutMs: AqlExpr }
  | { kind: "FetchStmt"; target: "OCCUPANTS" | "METADATA" | "SNAPSHOT" }
  | { kind: "ShowStmt"; target: "RESPONSE" | "HEADERS" | AqlExpr }
  | { kind: "IntoStmt"; name: string }
  | { kind: "ReturnStmt"; value: AqlExpr }
  | {
      kind: "MacroDefStmt";
      name: string;
      params: Array<{ name: string; defaultValue?: AqlExpr }>;
      body: AqlStatement[];
    }
  | { kind: "CallStmt"; name: string; args: AqlExpr[] };

export type AqlProgram = {
  kind: "Program";
  statements: AqlStatement[];
};

export type AqlExecutionOutput = {
  response: unknown;
  headers: Record<string, string>;
  status: number;
  timingMs: number;
};

export type AqlExecutionState = {
  serverUrl: string;
  mainNodeId: string;
  sid: string | null;
  /** Hex password material derived from validated main-node passphrase. */
  nodePasswordMaterial: string | null;
  /** Catalog space id resolved after USE SPACE NODE (GET /api/nodes). */
  spaceCatalogId: string | null;
  spaceNodeId: string | null;
  /** Hex passphrase material for the space node (USE SPACE NODE). */
  spacePasswordMaterial: string | null;
  targetAgentId: string | null;
  targetNodeId: string | null;
  timeoutMs: number;
  headers: Record<string, string>;
};
