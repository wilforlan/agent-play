export const BOOTSTRAP_ENVIRONMENTS = [
  { id: "local-server", url: "http://127.0.0.1:3000" },
  { id: "test-server", url: "https://test-agent-play.com" },
  { id: "main-server", url: "https://agent-play.com" },
] as const;

export type BootstrapCliOpts = {
  rootFilePath?: string;
  serverUrl?: string;
};

export type ParsedBootstrapEnvironment =
  | { kind: "url"; url: string }
  | { kind: "preset"; url: string }
  | { kind: "custom" }
  | { kind: "invalid" };

export function normalizeAgentPlayServerBaseUrl(raw: string): string | null {
  const t = raw.trim();
  if (t.length === 0) {
    return null;
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return null;
    }
    return t.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function parseBootstrapNodeArgs(argv: string[]): BootstrapCliOpts {
  const out: BootstrapCliOpts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root-file" && typeof argv[i + 1] === "string") {
      out.rootFilePath = argv[++i];
      continue;
    }
    if (a === "--server-url" && typeof argv[i + 1] === "string") {
      const normalized = normalizeAgentPlayServerBaseUrl(argv[++i]);
      if (normalized === null) {
        throw new Error(
          "Invalid --server-url: expected an absolute http(s) URL (e.g. https://agent-play.example.com)"
        );
      }
      out.serverUrl = normalized;
      continue;
    }
  }
  return out;
}

export function parseBootstrapEnvironmentChoice(raw: string): ParsedBootstrapEnvironment {
  const t = raw.trim();
  const lower = t.toLowerCase();
  if (/^https?:\/\//i.test(t)) {
    const url = normalizeAgentPlayServerBaseUrl(t);
    return url === null ? { kind: "invalid" } : { kind: "url", url };
  }
  if (lower === "" || lower === "1") {
    return { kind: "preset", url: BOOTSTRAP_ENVIRONMENTS[0].url };
  }
  if (lower === "2") {
    return { kind: "preset", url: BOOTSTRAP_ENVIRONMENTS[1].url };
  }
  if (lower === "3") {
    return { kind: "preset", url: BOOTSTRAP_ENVIRONMENTS[2].url };
  }
  if (lower === "4" || lower === "custom") {
    return { kind: "custom" };
  }
  for (const e of BOOTSTRAP_ENVIRONMENTS) {
    if (lower === e.id) {
      return { kind: "preset", url: e.url };
    }
  }
  if (lower === "local") {
    return { kind: "preset", url: BOOTSTRAP_ENVIRONMENTS[0].url };
  }
  if (lower === "test") {
    return { kind: "preset", url: BOOTSTRAP_ENVIRONMENTS[1].url };
  }
  if (lower === "main") {
    return { kind: "preset", url: BOOTSTRAP_ENVIRONMENTS[2].url };
  }
  return { kind: "invalid" };
}
