/**
 * @packageDocumentation
 * @module @agent-play/web-ui/playground/aql-parser
 *
 * Recursive-descent parser that turns AQL tokens into an
 * {@link AqlProgram | AST}. Recognises the 3.1.1 additions:
 *
 * ```text
 * ADD SHOP ITEM TYPE "book" NAME ... DESCRIPTION ... PRICE 12.5
 * ADD SUPERMARKET ITEM ROW 1 NAME ... DESCRIPTION ... PRICE 1.25
 * ADD CARWASH CAR NAME ... MODEL ... YEAR 2024 PRICE 28999 COLOR "#5a87d1"
 * SET WALLET "<playerId>" BALANCE <usd>
 * ```
 *
 * @see ./aql-validator.ts and ./aql-executor.ts for downstream stages.
 */

import type {
  AqlExpr,
  AqlProgram,
  AqlStatement,
  AqlToken,
  AqlDiagnostic,
} from "./aql-types";

type ParseResult = {
  program: AqlProgram;
  diagnostics: AqlDiagnostic[];
};

class Parser {
  private readonly tokens: AqlToken[];
  private index = 0;
  private readonly diagnostics: AqlDiagnostic[] = [];

  constructor(tokens: AqlToken[]) {
    this.tokens = tokens;
  }

  parse(): ParseResult {
    const statements: AqlStatement[] = [];
    while (!this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt !== null) {
        statements.push(stmt);
      } else {
        this.index += 1;
      }
    }
    return {
      program: { kind: "Program", statements },
      diagnostics: this.diagnostics,
    };
  }

  private parseStatement(): AqlStatement | null {
    const token = this.peek();
    if (token === null) return null;
    if (token.kind !== "keyword") {
      this.error(token, "AQL_PARSE_ERROR", `Expected statement keyword, got '${token.value}'`);
      return null;
    }
    switch (token.value) {
      case "LET":
        return this.parseLet();
      case "CREATE":
        return this.parseCreate();
      case "CONNECT":
        return this.parseConnect();
      case "INSPECT":
        return this.parseInspect();
      case "USE":
        return this.parseUse();
      case "ADD":
        return this.parseAdd();
      case "REMOVE":
        return this.parseRemove();
      case "SHIFT":
        return this.parseShift();
      case "SEND":
        return this.parseSend();
      case "WITH":
        return this.parseWith();
      case "FETCH":
        return this.parseFetch();
      case "SHOW":
        return this.parseShow();
      case "INTO":
        return this.parseInto();
      case "MACRO":
        return this.parseMacro();
      case "CALL":
        return this.parseCall();
      case "RETURN":
        return this.parseReturn();
      case "SET":
        return this.parseSet();
      default:
        this.error(token, "AQL_PARSE_ERROR", `Unsupported keyword '${token.value}'`);
        return null;
    }
  }

  private parseSet(): AqlStatement | null {
    this.advance();
    if (!this.matchKeyword("WALLET")) return null;
    if (!this.matchKeyword("PLAYER")) return null;
    const playerId = this.parseExpr();
    if (playerId === null) return null;
    if (!this.matchKeyword("BALANCE")) return null;
    const balanceUsd = this.parseExpr();
    return balanceUsd === null
      ? null
      : { kind: "SetWalletStmt", playerId, balanceUsd };
  }

  private parseLet(): AqlStatement | null {
    this.advance();
    const id = this.expectIdentifier("Expected variable name after LET");
    if (id === null) return null;
    if (!this.matchSymbol("=")) return null;
    const expr = this.parseExpr();
    return expr === null ? null : { kind: "LetStmt", name: id.value, value: expr };
  }

  private parseConnect(): AqlStatement | null {
    this.advance();
    if (!this.matchKeyword("SERVER")) return null;
    const serverUrl = this.parseExpr();
    if (serverUrl === null) return null;
    if (!this.matchKeyword("MAIN_NODE")) return null;
    const mainNodeId = this.parseExpr();
    if (mainNodeId === null) return null;
    return { kind: "ConnectStmt", serverUrl, mainNodeId };
  }

  private parseInspect(): AqlStatement | null {
    this.advance();
    const token = this.peek();
    if (token === null || token.kind !== "keyword") {
      this.error(token, "AQL_PARSE_ERROR", "Expected MAIN, SPACE, AMENITY, or AGENT after INSPECT");
      return null;
    }
    if (token.value === "MAIN") {
      this.advance();
      if (!this.matchKeyword("NODE")) return null;
      return { kind: "InspectMainNodeStmt" };
    }
    if (token.value === "SPACE") {
      this.advance();
      return { kind: "InspectSpaceStmt" };
    }
    if (token.value === "AMENITY") {
      this.advance();
      const probe = this.peek();
      if (
        probe !== null &&
        (probe.kind === "string" || probe.kind === "number" || probe.kind === "variable")
      ) {
        const kindFilter = this.parseExpr();
        return kindFilter === null ? null : { kind: "InspectAmenityStmt", kindFilter };
      }
      return { kind: "InspectAmenityStmt", kindFilter: undefined };
    }
    if (token.value === "AGENT") {
      this.advance();
      if (this.checkKeyword("NODE")) {
        this.advance();
        return { kind: "InspectAgentNodeStmt" };
      }
      return { kind: "InspectAgentStmt" };
    }
    if (token.value === "WALLET") {
      this.advance();
      const playerId = this.parseExpr();
      return playerId === null
        ? null
        : { kind: "InspectWalletStmt", playerId };
    }
    this.error(token, "AQL_PARSE_ERROR", "Expected MAIN, SPACE, AMENITY, AGENT, or WALLET after INSPECT");
    return null;
  }

  private parseCreate(): AqlStatement | null {
    this.advance();
    const head = this.peek();
    if (head !== null && head.kind === "keyword" && head.value === "LEASE") {
      this.advance();
      if (!this.matchKeyword("AMENITY")) return null;
      const amenityKind = this.parseExpr();
      if (amenityKind === null) return null;
      if (!this.matchKeyword("EMAIL")) return null;
      const email = this.parseExpr();
      if (email === null) return null;
      if (!this.matchKeyword("ADDRESS")) return null;
      const address = this.parseExpr();
      if (address === null) return null;
      if (!this.matchKeyword("MONTHS")) return null;
      const durationMonths = this.parseExpr();
      if (durationMonths === null) return null;
      let humanPlayerId: AqlExpr | undefined;
      if (this.checkKeyword("HUMAN")) {
        this.advance();
        const hid = this.parseExpr();
        if (hid === null) return null;
        humanPlayerId = hid;
      }
      return {
        kind: "CreateLeaseStmt",
        amenityKind,
        email,
        address,
        durationMonths,
        ...(humanPlayerId !== undefined ? { humanPlayerId } : {}),
      };
    }
    if (!this.matchKeyword("SPACE")) return null;
    const name = this.parseExpr();
    if (name === null) return null;
    if (!this.matchKeyword("DESIGN")) return null;
    const designKey = this.parseExpr();
    if (designKey === null) return null;
    if (!this.matchKeyword("OWNER")) return null;
    const ownerDisplayName = this.parseExpr();
    if (ownerDisplayName === null) return null;
    let description: AqlExpr | undefined;
    if (this.checkKeyword("DESCRIPTION")) {
      this.advance();
      const d = this.parseExpr();
      if (d === null) return null;
      description = d;
    }
    let structureName: AqlExpr | undefined;
    if (this.checkKeyword("STRUCTURE")) {
      this.advance();
      const sn = this.parseExpr();
      if (sn === null) return null;
      structureName = sn;
    }
    return {
      kind: "CreateSpaceStmt",
      name,
      designKey,
      ownerDisplayName,
      ...(description !== undefined ? { description } : {}),
      ...(structureName !== undefined ? { structureName } : {}),
    };
  }

  private parseRemove(): AqlStatement | null {
    this.advance();
    const token = this.peek();
    if (token !== null && token.kind === "keyword" && token.value === "SPACE") {
      this.advance();
      const spaceId = this.parseExpr();
      return spaceId === null ? null : { kind: "RemoveSpaceStmt", spaceId };
    }
    if (token !== null && token.kind === "keyword" && token.value === "AMENITY") {
      this.advance();
      const spaceId = this.parseExpr();
      if (spaceId === null) return null;
      const amenityKind = this.parseExpr();
      return amenityKind === null
        ? null
        : { kind: "RemoveSpaceAmenityStmt", spaceId, amenityKind };
    }
    this.error(token, "AQL_PARSE_ERROR", "Expected SPACE or AMENITY after REMOVE");
    return null;
  }

  private parseAdd(): AqlStatement | null {
    this.advance();
    const head = this.peek();
    if (head === null) {
      this.error(head, "AQL_PARSE_ERROR", "Expected AMENITY / SHOP / SUPERMARKET / CARWASH after ADD");
      return null;
    }
    if (head.kind === "keyword" && head.value === "AMENITY") {
      this.advance();
      const amenityKind = this.parseExpr();
      return amenityKind === null
        ? null
        : { kind: "AddSpaceAmenityStmt", amenityKind };
    }
    if (head.kind === "keyword" && head.value === "SHOP") {
      this.advance();
      if (!this.matchKeyword("ITEM")) return null;
      return this.parseShopItemFields();
    }
    if (head.kind === "keyword" && head.value === "SUPERMARKET") {
      this.advance();
      if (!this.matchKeyword("ITEM")) return null;
      return this.parseSupermarketItemFields();
    }
    if (head.kind === "keyword" && head.value === "CARWASH") {
      this.advance();
      if (!this.matchKeyword("CAR")) return null;
      return this.parseCarWashCarFields();
    }
    this.error(
      head,
      "AQL_PARSE_ERROR",
      "Expected AMENITY / SHOP / SUPERMARKET / CARWASH after ADD"
    );
    return null;
  }

  private parseShopItemFields(): AqlStatement | null {
    if (!this.matchKeyword("TYPE")) return null;
    const itemType = this.parseExpr();
    if (itemType === null) return null;
    if (!this.matchKeyword("NAME")) return null;
    const name = this.parseExpr();
    if (name === null) return null;
    if (!this.matchKeyword("DESCRIPTION")) return null;
    const description = this.parseExpr();
    if (description === null) return null;
    if (!this.matchKeyword("PRICE")) return null;
    const priceUsd = this.parseExpr();
    if (priceUsd === null) return null;
    return {
      kind: "AddShopItemStmt",
      itemType,
      name,
      description,
      priceUsd,
    };
  }

  private parseSupermarketItemFields(): AqlStatement | null {
    if (!this.matchKeyword("ROW")) return null;
    const row = this.parseExpr();
    if (row === null) return null;
    if (!this.matchKeyword("NAME")) return null;
    const name = this.parseExpr();
    if (name === null) return null;
    if (!this.matchKeyword("DESCRIPTION")) return null;
    const description = this.parseExpr();
    if (description === null) return null;
    if (!this.matchKeyword("PRICE")) return null;
    const priceUsd = this.parseExpr();
    if (priceUsd === null) return null;
    let column: AqlExpr | undefined;
    if (this.checkKeyword("COLUMN")) {
      this.advance();
      const c = this.parseExpr();
      if (c === null) return null;
      column = c;
    }
    return {
      kind: "AddSupermarketItemStmt",
      row,
      name,
      description,
      priceUsd,
      ...(column !== undefined ? { column } : {}),
    };
  }

  private parseCarWashCarFields(): AqlStatement | null {
    let slot: AqlExpr | undefined;
    if (this.checkKeyword("SLOT")) {
      this.advance();
      const s = this.parseExpr();
      if (s === null) return null;
      slot = s;
    }
    if (!this.matchKeyword("NAME")) return null;
    const name = this.parseExpr();
    if (name === null) return null;
    if (!this.matchKeyword("MODEL")) return null;
    const model = this.parseExpr();
    if (model === null) return null;
    if (!this.matchKeyword("YEAR")) return null;
    const year = this.parseExpr();
    if (year === null) return null;
    if (!this.matchKeyword("PRICE")) return null;
    const priceUsd = this.parseExpr();
    if (priceUsd === null) return null;
    if (!this.matchKeyword("COLOR")) return null;
    const colorHex = this.parseExpr();
    if (colorHex === null) return null;
    return {
      kind: "AddCarWashCarStmt",
      name,
      model,
      year,
      priceUsd,
      colorHex,
      ...(slot !== undefined ? { slot } : {}),
    };
  }

  private parseUse(): AqlStatement | null {
    this.advance();
    if (this.checkKeyword("SPACE")) {
      this.advance();
      if (!this.matchKeyword("NODE")) return null;
      const nodeId = this.parseExpr();
      if (nodeId === null) return null;
      if (!this.matchKeyword("PASSPHRASE")) return null;
      const passphrase = this.parseExpr();
      return passphrase === null ? null : { kind: "UseSpaceNodeStmt", nodeId, passphrase };
    }
    if (!this.matchKeyword("AGENT")) return null;
    if (!this.matchKeyword("NODE")) return null;
    const nodeId = this.parseExpr();
    return nodeId === null ? null : { kind: "UseAgentNodeStmt", nodeId };
  }

  private parseShift(): AqlStatement | null {
    this.advance();
    if (!this.matchKeyword("AGENT")) return null;
    if (!this.matchKeyword("NODE")) return null;
    const nodeId = this.parseExpr();
    return nodeId === null ? null : { kind: "ShiftAgentNodeStmt", nodeId };
  }

  private parseSend(): AqlStatement | null {
    this.advance();
    const message = this.parseExpr();
    return message === null ? null : { kind: "SendStmt", message };
  }

  private parseWith(): AqlStatement | null {
    this.advance();
    const clause = this.peekWithClauseKind();
    if (clause === null) {
      const token = this.peek();
      this.error(token, "AQL_PARSE_ERROR", "Expected HEADER or TIMEOUT after WITH");
      return null;
    }
    this.advance();
    if (clause === "HEADER") {
      const key = this.parseExpr();
      if (key === null) return null;
      if (!this.matchSymbol("=")) return null;
      const value = this.parseExpr();
      return value === null ? null : { kind: "WithHeaderStmt", key, value };
    }
    const timeoutMs = this.parseExpr();
    return timeoutMs === null ? null : { kind: "WithTimeoutStmt", timeoutMs };
  }

  private peekWithClauseKind(): "HEADER" | "TIMEOUT" | null {
    const token = this.peek();
    if (token === null) return null;
    if (token.kind === "keyword") {
      if (token.value === "HEADER" || token.value === "TIMEOUT") {
        return token.value;
      }
      return null;
    }
    if (token.kind !== "identifier") return null;
    const upper = token.value.toUpperCase();
    if (upper === "HEADER" || upper === "TIMEOUT") {
      return upper;
    }
    return null;
  }

  private parseFetch(): AqlStatement | null {
    this.advance();
    const token = this.expectKeyword("Expected FETCH target");
    if (token === null) return null;
    if (token.value === "OCCUPANTS" || token.value === "METADATA" || token.value === "SNAPSHOT") {
      return { kind: "FetchStmt", target: token.value };
    }
    this.error(token, "AQL_PARSE_ERROR", `Unsupported FETCH target '${token.value}'`);
    return null;
  }

  private parseShow(): AqlStatement | null {
    this.advance();
    const token = this.peek();
    if (token === null) return null;
    if (token.kind === "keyword" && (token.value === "RESPONSE" || token.value === "HEADERS")) {
      this.advance();
      return { kind: "ShowStmt", target: token.value };
    }
    const expr = this.parseExpr();
    return expr === null ? null : { kind: "ShowStmt", target: expr };
  }

  private parseInto(): AqlStatement | null {
    this.advance();
    const id = this.expectIdentifier("Expected binding name after INTO");
    return id === null ? null : { kind: "IntoStmt", name: id.value };
  }

  private parseReturn(): AqlStatement | null {
    this.advance();
    const value = this.parseExpr();
    return value === null ? null : { kind: "ReturnStmt", value };
  }

  private parseMacro(): AqlStatement | null {
    this.advance();
    const name = this.expectIdentifier("Expected macro name");
    if (name === null) return null;
    if (!this.matchSymbol("(")) return null;
    const params: Array<{ name: string; defaultValue?: AqlExpr }> = [];
    while (!this.checkSymbol(")")) {
      const paramName = this.expectIdentifier("Expected macro parameter");
      if (paramName === null) return null;
      const param: { name: string; defaultValue?: AqlExpr } = { name: paramName.value };
      if (this.checkSymbol("=")) {
        this.advance();
        const defaultValue = this.parseExpr();
        if (defaultValue === null) return null;
        param.defaultValue = defaultValue;
      }
      params.push(param);
      if (this.checkSymbol(")")) {
        this.advance();
        break;
      }
      if (!this.matchSymbol(",")) return null;
    }
    if (this.checkSymbol(")")) this.advance();
    if (!this.matchSymbol("{")) return null;
    const body: AqlStatement[] = [];
    while (!this.checkSymbol("}")) {
      if (this.isAtEnd()) {
        this.error(this.peek(), "AQL_PARSE_ERROR", "Unterminated MACRO body");
        break;
      }
      const stmt = this.parseStatement();
      if (stmt !== null) body.push(stmt);
      else this.index += 1;
    }
    if (this.checkSymbol("}")) this.advance();
    return { kind: "MacroDefStmt", name: name.value, params, body };
  }

  private parseCall(): AqlStatement | null {
    this.advance();
    const name = this.expectIdentifier("Expected macro name after CALL");
    if (name === null) return null;
    if (!this.matchSymbol("(")) return null;
    const args: AqlExpr[] = [];
    while (!this.checkSymbol(")")) {
      const arg = this.parseExpr();
      if (arg === null) return null;
      args.push(arg);
      if (this.checkSymbol(")")) {
        this.advance();
        break;
      }
      if (!this.matchSymbol(",")) return null;
    }
    if (this.checkSymbol(")")) this.advance();
    return { kind: "CallStmt", name: name.value, args };
  }

  private parseExpr(): AqlExpr | null {
    const token = this.peek();
    if (token === null) return null;
    if (token.kind === "string") {
      this.advance();
      return { kind: "StringLiteral", value: token.value };
    }
    if (token.kind === "number") {
      this.advance();
      return { kind: "NumberLiteral", value: Number(token.value) };
    }
    if (token.kind === "variable") {
      this.advance();
      return { kind: "VarRef", name: token.value };
    }
    this.error(token, "AQL_PARSE_ERROR", `Expected expression, got '${token.value}'`);
    return null;
  }

  private expectIdentifier(message: string): AqlToken | null {
    const token = this.peek();
    if (token !== null && token.kind === "identifier") {
      this.advance();
      return token;
    }
    this.error(token, "AQL_PARSE_ERROR", message);
    return null;
  }

  private expectKeyword(message: string): AqlToken | null {
    const token = this.peek();
    if (token !== null && token.kind === "keyword") {
      this.advance();
      return token;
    }
    this.error(token, "AQL_PARSE_ERROR", message);
    return null;
  }

  private matchKeyword(value: string): boolean {
    const token = this.peek();
    if (token !== null && token.kind === "keyword" && token.value === value) {
      this.advance();
      return true;
    }
    this.error(token, "AQL_PARSE_ERROR", `Expected keyword '${value}'`);
    return false;
  }

  private matchSymbol(value: string): boolean {
    const token = this.peek();
    if (token !== null && token.kind === "symbol" && token.value === value) {
      this.advance();
      return true;
    }
    this.error(token, "AQL_PARSE_ERROR", `Expected symbol '${value}'`);
    return false;
  }

  private checkSymbol(value: string): boolean {
    const token = this.peek();
    return token !== null && token.kind === "symbol" && token.value === value;
  }

  private checkKeyword(value: string): boolean {
    const token = this.peek();
    if (token === null) return false;
    if (token.kind === "keyword" && token.value === value) return true;
    if (token.kind !== "identifier") return false;
    return token.value.toUpperCase() === value;
  }

  private error(token: AqlToken | null, code: string, message: string): void {
    this.diagnostics.push({
      code,
      message,
      severity: "error",
      line: token?.line ?? 1,
      column: token?.column ?? 1,
    });
  }

  private peek(): AqlToken | null {
    return this.tokens[this.index] ?? null;
  }

  private advance(): void {
    this.index += 1;
  }

  private isAtEnd(): boolean {
    return this.index >= this.tokens.length;
  }
}

export function parseAql(tokens: AqlToken[]): ParseResult {
  return new Parser(tokens).parse();
}
