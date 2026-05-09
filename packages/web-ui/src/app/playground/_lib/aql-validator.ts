import type {
  AqlDiagnostic,
  AqlExpr,
  AqlProgram,
  AqlStatement,
} from "./aql-types";

type ValidationResult = {
  diagnostics: AqlDiagnostic[];
};

function exprVarName(expr: AqlExpr): string | null {
  return expr.kind === "VarRef" ? expr.name : null;
}

export function validateAql(program: AqlProgram): ValidationResult {
  const diagnostics: AqlDiagnostic[] = [];
  const vars = new Set<string>();
  const macros = new Map<string, { paramCount: number; minArgs: number }>();
  let hasAgentTarget = false;

  const validateExpr = (expr: AqlExpr): void => {
    const varName = exprVarName(expr);
    if (varName !== null && !vars.has(varName)) {
      diagnostics.push({
        code: "AQL_SEMANTIC_ERROR",
        severity: "error",
        message: `Variable '${varName}' is not defined`,
        line: 1,
        column: 1,
      });
    }
  };

  const visitStatement = (stmt: AqlStatement): void => {
    switch (stmt.kind) {
      case "LetStmt":
        validateExpr(stmt.value);
        vars.add(stmt.name);
        return;
      case "UseAgentNodeStmt":
      case "ShiftAgentNodeStmt":
        validateExpr(stmt.nodeId);
        hasAgentTarget = true;
        return;
      case "InspectMainNodeStmt":
      case "InspectAgentNodeStmt":
      case "InspectAgentStmt":
        return;
      case "SendStmt":
        validateExpr(stmt.message);
        if (!hasAgentTarget) {
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: "SEND requires USE AGENT NODE first",
            line: 1,
            column: 1,
          });
        }
        return;
      case "WithHeaderStmt":
        validateExpr(stmt.key);
        validateExpr(stmt.value);
        return;
      case "WithTimeoutStmt":
        validateExpr(stmt.timeoutMs);
        if (stmt.timeoutMs.kind === "NumberLiteral" && stmt.timeoutMs.value <= 0) {
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: "WITH TIMEOUT must be a positive integer",
            line: 1,
            column: 1,
          });
        }
        return;
      case "ConnectStmt":
        validateExpr(stmt.serverUrl);
        validateExpr(stmt.mainNodeId);
        return;
      case "FetchStmt":
      case "IntoStmt":
        return;
      case "ShowStmt":
        if (typeof stmt.target !== "string") {
          validateExpr(stmt.target);
        }
        return;
      case "ReturnStmt":
        validateExpr(stmt.value);
        return;
      case "MacroDefStmt": {
        if (macros.has(stmt.name)) {
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: `Macro '${stmt.name}' already defined`,
            line: 1,
            column: 1,
          });
          return;
        }
        const required = stmt.params.filter((p) => p.defaultValue === undefined).length;
        macros.set(stmt.name, { paramCount: stmt.params.length, minArgs: required });
        const scopedVars = new Set(vars);
        for (const param of stmt.params) {
          scopedVars.add(param.name);
        }
        const previousVars = new Set(vars);
        vars.clear();
        for (const scoped of scopedVars) vars.add(scoped);
        for (const inner of stmt.body) visitStatement(inner);
        vars.clear();
        for (const v of previousVars) vars.add(v);
        return;
      }
      case "CallStmt": {
        const macro = macros.get(stmt.name);
        if (macro === undefined) {
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: `Macro '${stmt.name}' is not defined`,
            line: 1,
            column: 1,
          });
          return;
        }
        if (stmt.args.length < macro.minArgs || stmt.args.length > macro.paramCount) {
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: `CALL ${stmt.name} expects ${macro.minArgs}-${macro.paramCount} args, got ${stmt.args.length}`,
            line: 1,
            column: 1,
          });
        }
        for (const arg of stmt.args) validateExpr(arg);
      }
    }
  };

  for (const stmt of program.statements) {
    visitStatement(stmt);
  }
  return { diagnostics };
}
