export type AqlSuggestion = {
  label: string;
  insertText: string;
  kind: "keyword" | "variable";
};

export type AqlAutocompleteResult = {
  from: number;
  to: number;
  options: AqlSuggestion[];
};

const KEYWORD_SUGGESTIONS: AqlSuggestion[] = [
  { label: "INSPECT MAIN NODE", insertText: "INSPECT MAIN NODE", kind: "keyword" },
  { label: "INSPECT SPACE", insertText: "INSPECT SPACE", kind: "keyword" },
  { label: "INSPECT AMENITY", insertText: "INSPECT AMENITY ", kind: "keyword" },
  { label: "CREATE SPACE", insertText: "CREATE SPACE ", kind: "keyword" },
  { label: "USE SPACE NODE", insertText: "USE SPACE NODE ", kind: "keyword" },
  { label: "ADD AMENITY", insertText: "ADD AMENITY ", kind: "keyword" },
  { label: "REMOVE SPACE", insertText: "REMOVE SPACE ", kind: "keyword" },
  { label: "REMOVE AMENITY", insertText: "REMOVE AMENITY ", kind: "keyword" },
  { label: "CREATE LEASE AMENITY", insertText: "CREATE LEASE AMENITY ", kind: "keyword" },
  { label: "INSPECT AGENT NODE", insertText: "INSPECT AGENT NODE", kind: "keyword" },
  { label: "INSPECT AGENT", insertText: "INSPECT AGENT", kind: "keyword" },
  { label: "USE AGENT NODE", insertText: "USE AGENT NODE ", kind: "keyword" },
  { label: "SHIFT AGENT NODE", insertText: "SHIFT AGENT NODE ", kind: "keyword" },
  { label: "SEND", insertText: "SEND ", kind: "keyword" },
  { label: "WITH TIMEOUT", insertText: "WITH TIMEOUT ", kind: "keyword" },
  { label: "WITH HEADER", insertText: "WITH HEADER ", kind: "keyword" },
  { label: "FETCH SNAPSHOT", insertText: "FETCH SNAPSHOT", kind: "keyword" },
  { label: "FETCH OCCUPANTS", insertText: "FETCH OCCUPANTS", kind: "keyword" },
  { label: "FETCH METADATA", insertText: "FETCH METADATA", kind: "keyword" },
  { label: "SHOW RESPONSE", insertText: "SHOW RESPONSE", kind: "keyword" },
  { label: "SHOW HEADERS", insertText: "SHOW HEADERS", kind: "keyword" },
  { label: "INTO", insertText: "INTO ", kind: "keyword" },
  { label: "LET", insertText: "LET ", kind: "keyword" },
  { label: "CONNECT SERVER", insertText: "CONNECT SERVER ", kind: "keyword" },
  { label: "MACRO", insertText: "MACRO ", kind: "keyword" },
  { label: "CALL", insertText: "CALL ", kind: "keyword" },
  { label: "RETURN", insertText: "RETURN ", kind: "keyword" },
];

const AGENT_FIELD_SUGGESTIONS = [
  "$agent.name",
  "$agent.nodeId",
  "$agent.agentId",
  "$agent.platform",
  "$agent.toolNames",
  "$agent.metadata",
  "$node.kind",
  "$node.nodeId",
];

function extractVarSuggestions(source: string): AqlSuggestion[] {
  const names = new Set<string>();
  const letRegex = /\bLET\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/g;
  let match = letRegex.exec(source);
  while (match !== null) {
    const name = match[1];
    if (typeof name === "string" && name.length > 0) {
      names.add(`$${name}`);
    }
    match = letRegex.exec(source);
  }
  for (const field of AGENT_FIELD_SUGGESTIONS) {
    names.add(field);
  }
  return Array.from(names)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ label: name, insertText: name, kind: "variable" as const }));
}

function tokenStart(source: string, cursor: number): number {
  let start = cursor;
  while (start > 0) {
    const ch = source[start - 1] ?? "";
    if (!/[A-Za-z0-9_$.]/.test(ch)) break;
    start -= 1;
  }
  return start;
}

export function getAqlAutocomplete(input: {
  source: string;
  cursor: number;
}): AqlAutocompleteResult {
  const cursor = Math.max(0, Math.min(input.cursor, input.source.length));
  const from = tokenStart(input.source, cursor);
  const prefix = input.source.slice(from, cursor);
  const normalized = prefix.trim();
  const lower = normalized.toLowerCase();
  if (normalized.length === 0) {
    return { from, to: cursor, options: [] };
  }

  const variableMode = normalized.startsWith("$");
  const pool = variableMode
    ? extractVarSuggestions(input.source)
    : [...KEYWORD_SUGGESTIONS, ...extractVarSuggestions(input.source)];

  const options = pool.filter((item) => item.label.toLowerCase().startsWith(lower));
  return { from, to: cursor, options: options.slice(0, 10) };
}

export function applyAqlAutocomplete(input: {
  source: string;
  from: number;
  to: number;
  insertText: string;
}): { source: string; cursor: number } {
  const next =
    input.source.slice(0, input.from) + input.insertText + input.source.slice(input.to);
  return { source: next, cursor: input.from + input.insertText.length };
}
