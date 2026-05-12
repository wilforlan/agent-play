/**
 * @packageDocumentation
 * @module @agent-play/web-ui/playground/aql-validator
 *
 * Required-field, enum, and contextual validation for the AQL AST. In 3.1.1
 * also checks that the active session has the matching `USE SPACE NODE` for
 * `ADD SHOP ITEM`, `ADD SUPERMARKET ITEM`, and `ADD CARWASH CAR`, and that
 * priced amounts (`PRICE`) are positive finite numbers.
 *
 * @see ./aql-executor.ts for the dispatch that consumes the validated AST.
 */

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
  let hasSpaceUse = false;
  let hasAmenityScope = false;

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
        hasSpaceUse = false;
        hasAmenityScope = false;
        return;
      case "UseSpaceNodeStmt":
        validateExpr(stmt.nodeId);
        validateExpr(stmt.passphrase);
        hasSpaceUse = true;
        hasAgentTarget = false;
        hasAmenityScope = false;
        return;
      case "UseAmenityStmt":
        validateExpr(stmt.amenityKind);
        if (!hasSpaceUse) {
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: "USE AMENITY requires USE SPACE NODE first",
            line: 1,
            column: 1,
          });
        }
        hasAmenityScope = true;
        return;
      case "CreateSpaceStmt":
        validateExpr(stmt.name);
        validateExpr(stmt.designKey);
        validateExpr(stmt.ownerDisplayName);
        if (stmt.description !== undefined) {
          validateExpr(stmt.description);
        }
        if (stmt.structureName !== undefined) {
          validateExpr(stmt.structureName);
        }
        return;
      case "CreateLeaseStmt":
        validateExpr(stmt.amenityKind);
        validateExpr(stmt.email);
        validateExpr(stmt.address);
        validateExpr(stmt.durationMonths);
        if (stmt.humanPlayerId !== undefined) {
          validateExpr(stmt.humanPlayerId);
        }
        if (!hasSpaceUse) {
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: "CREATE LEASE AMENITY requires USE SPACE NODE first",
            line: 1,
            column: 1,
          });
        }
        return;
      case "InspectMainNodeStmt":
      case "InspectAgentNodeStmt":
      case "InspectAgentStmt":
        return;
      case "InspectSpaceStmt":
        if (!hasSpaceUse) {
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: "INSPECT SPACE requires USE SPACE NODE first",
            line: 1,
            column: 1,
          });
        }
        return;
      case "InspectAmenityStmt":
        if (stmt.kindFilter !== undefined) {
          validateExpr(stmt.kindFilter);
        }
        if (!hasSpaceUse) {
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: "INSPECT AMENITY requires USE SPACE NODE first",
            line: 1,
            column: 1,
          });
        }
        return;
      case "AddSpaceAmenityStmt":
        validateExpr(stmt.amenityKind);
        if (!hasSpaceUse) {
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: "ADD AMENITY requires USE SPACE NODE first",
            line: 1,
            column: 1,
          });
        }
        return;
      case "AddShopItemStmt":
      case "AddSupermarketItemStmt":
      case "AddCarWashCarStmt": {
        if (stmt.kind === "AddShopItemStmt") {
          validateExpr(stmt.itemType);
          validateExpr(stmt.description);
        }
        validateExpr(stmt.name);
        if (stmt.kind === "AddCarWashCarStmt") {
          validateExpr(stmt.model);
          validateExpr(stmt.year);
          validateExpr(stmt.colorHex);
          if (stmt.slot !== undefined) validateExpr(stmt.slot);
        }
        if (stmt.kind === "AddSupermarketItemStmt") {
          validateExpr(stmt.row);
          validateExpr(stmt.description);
          if (stmt.column !== undefined) validateExpr(stmt.column);
        }
        validateExpr(stmt.priceUsd);
        if (!hasSpaceUse) {
          const label =
            stmt.kind === "AddShopItemStmt"
              ? "ADD SHOP ITEM"
              : stmt.kind === "AddSupermarketItemStmt"
                ? "ADD SUPERMARKET ITEM"
                : "ADD CARWASH CAR";
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: `${label} requires USE SPACE NODE first`,
            line: 1,
            column: 1,
          });
        }
        return;
      }
      case "SetWalletStmt":
        validateExpr(stmt.playerId);
        validateExpr(stmt.balanceUsd);
        return;
      case "InspectWalletStmt":
        validateExpr(stmt.playerId);
        return;
      case "RemoveSpaceAmenityStmt":
        validateExpr(stmt.spaceId);
        validateExpr(stmt.amenityKind);
        return;
      case "RemoveSpaceStmt":
        validateExpr(stmt.spaceId);
        return;
      case "RemoveAmenityItemsStmt": {
        if (stmt.itemIds !== undefined) {
          for (const id of stmt.itemIds) validateExpr(id);
        }
        if (!hasSpaceUse) {
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: "REMOVE AMENITY ITEMS requires USE SPACE NODE first",
            line: 1,
            column: 1,
          });
        }
        if (!hasAmenityScope) {
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: "REMOVE AMENITY ITEMS requires USE AMENITY first",
            line: 1,
            column: 1,
          });
        }
        if (!stmt.all && (stmt.itemIds === undefined || stmt.itemIds.length === 0)) {
          diagnostics.push({
            code: "AQL_SEMANTIC_ERROR",
            severity: "error",
            message: "REMOVE AMENITY ITEMS requires ALL or at least one id",
            line: 1,
            column: 1,
          });
        }
        return;
      }
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
        const previousHasSpaceUse = hasSpaceUse;
        const previousHasAmenityScope = hasAmenityScope;
        vars.clear();
        for (const scoped of scopedVars) vars.add(scoped);
        hasSpaceUse = false;
        hasAmenityScope = false;
        for (const inner of stmt.body) visitStatement(inner);
        hasSpaceUse = previousHasSpaceUse;
        hasAmenityScope = previousHasAmenityScope;
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
