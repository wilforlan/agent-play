import type { AqlToken } from "./aql-types";

const KEYWORDS = new Set([
  "LET",
  "MACRO",
  "CALL",
  "CONNECT",
  "SERVER",
  "MAIN_NODE",
  "CREATE",
  "REMOVE",
  "ADD",
  "SPACE",
  "DESIGN",
  "OWNER",
  "STRUCTURE",
  "DESCRIPTION",
  "LEASE",
  "AMENITY",
  "EMAIL",
  "ADDRESS",
  "MONTHS",
  "HUMAN",
  "PASSPHRASE",
  "USE",
  "SHIFT",
  "INSPECT",
  "MAIN",
  "AGENT",
  "NODE",
  "SEND",
  "WITH",
  "HEADER",
  "TIMEOUT",
  "FETCH",
  "SHOW",
  "INTO",
  "RETURN",
  "OCCUPANTS",
  "METADATA",
  "SNAPSHOT",
  "RESPONSE",
  "HEADERS",
]);

export function tokenizeAql(source: string): AqlToken[] {
  const tokens: AqlToken[] = [];
  let i = 0;
  let line = 1;
  let column = 1;

  const push = (kind: AqlToken["kind"], value: string, l = line, c = column): void => {
    tokens.push({ kind, value, line: l, column: c });
  };

  while (i < source.length) {
    const ch = source[i];
    if (ch === undefined) break;
    if (ch === "\n") {
      i += 1;
      line += 1;
      column = 1;
      continue;
    }
    if (/\s/.test(ch)) {
      i += 1;
      column += 1;
      continue;
    }
    if (ch === "#") {
      while (i < source.length && source[i] !== "\n") {
        i += 1;
        column += 1;
      }
      continue;
    }
    if (ch === "$") {
      const startColumn = column;
      i += 1;
      column += 1;
      let value = "";
      while (i < source.length && /[A-Za-z0-9_.]/.test(source[i] ?? "")) {
        value += source[i];
        i += 1;
        column += 1;
      }
      push("variable", value, line, startColumn);
      continue;
    }
    if (ch === '"') {
      const startColumn = column;
      i += 1;
      column += 1;
      let value = "";
      while (i < source.length) {
        const current = source[i];
        if (current === undefined) break;
        if (current === '"') {
          i += 1;
          column += 1;
          break;
        }
        if (current === "\\" && source[i + 1] !== undefined) {
          value += source[i + 1];
          i += 2;
          column += 2;
          continue;
        }
        value += current;
        i += 1;
        column += 1;
      }
      push("string", value, line, startColumn);
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const startColumn = column;
      let value = "";
      while (i < source.length && /[0-9]/.test(source[i] ?? "")) {
        value += source[i];
        i += 1;
        column += 1;
      }
      push("number", value, line, startColumn);
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const startColumn = column;
      let value = "";
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i] ?? "")) {
        value += source[i];
        i += 1;
        column += 1;
      }
      const upper = value.toUpperCase();
      if (value === upper && KEYWORDS.has(upper)) {
        push("keyword", upper, line, startColumn);
      } else {
        push("identifier", value, line, startColumn);
      }
      continue;
    }
    if ("(){}=,".includes(ch)) {
      push("symbol", ch);
      i += 1;
      column += 1;
      continue;
    }
    i += 1;
    column += 1;
  }
  return tokens;
}
