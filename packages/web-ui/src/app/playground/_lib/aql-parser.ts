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
      case "CONNECT":
        return this.parseConnect();
      case "INSPECT":
        return this.parseInspect();
      case "USE":
        return this.parseUse();
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
      default:
        this.error(token, "AQL_PARSE_ERROR", `Unsupported keyword '${token.value}'`);
        return null;
    }
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
      this.error(token, "AQL_PARSE_ERROR", "Expected MAIN or AGENT after INSPECT");
      return null;
    }
    if (token.value === "MAIN") {
      this.advance();
      if (!this.matchKeyword("NODE")) return null;
      return { kind: "InspectMainNodeStmt" };
    }
    if (token.value === "AGENT") {
      this.advance();
      if (this.checkKeyword("NODE")) {
        this.advance();
        return { kind: "InspectAgentNodeStmt" };
      }
      return { kind: "InspectAgentStmt" };
    }
    this.error(token, "AQL_PARSE_ERROR", "Expected MAIN or AGENT after INSPECT");
    return null;
  }

  private parseUse(): AqlStatement | null {
    this.advance();
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
