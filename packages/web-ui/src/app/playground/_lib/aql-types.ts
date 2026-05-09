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
  | { kind: "InspectMainNodeStmt" }
  | { kind: "InspectAgentNodeStmt" }
  | { kind: "UseAgentNodeStmt"; nodeId: AqlExpr }
  | { kind: "ShiftAgentNodeStmt"; nodeId: AqlExpr }
  | { kind: "InspectAgentStmt" }
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
  targetAgentId: string | null;
  targetNodeId: string | null;
  timeoutMs: number;
  headers: Record<string, string>;
};
