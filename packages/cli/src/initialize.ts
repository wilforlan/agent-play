import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type InitializeCliOpts = {
  dir?: string;
  name?: string;
  template: "langchain";
  yes: boolean;
  force: boolean;
  bootstrapNodes?: boolean;
  agentCount?: 1 | 2;
  environment?: "development" | "test" | "production";
  serverType?: "bare" | "express";
};

export type InitializePromptApi = {
  askEnvironment: () => Promise<"development" | "test" | "production">;
  askServerType: () => Promise<"bare" | "express">;
  askBootstrapNodes: () => Promise<boolean>;
  askAgentCount: () => Promise<1 | 2>;
};

export type BootstrappedNodeIds = {
  mainNodeId: string;
  agentNodeIds: string[];
};

export type InitializeRuntimeApi = {
  bootstrapNodeIds: (options: {
    agentCount: 1 | 2;
    serverUrl: string;
  }) => Promise<BootstrappedNodeIds>;
};

export function resolveServerUrlForEnvironment(
  environment: "development" | "test" | "production"
): string {
  if (environment === "test") {
    return "https://test-agent-play.com";
  }
  if (environment === "production") {
    return "https://agent-play.com";
  }
  return "http://127.0.0.1:3000";
}

const TEMPLATE_ROOT = fileURLToPath(
  new URL("../templates/agent-starter/langchain", import.meta.url)
);

export function parseInitializeArgs(argv: string[]): InitializeCliOpts | null {
  const out: InitializeCliOpts = {
    template: "langchain",
    yes: false,
    force: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--dir" && typeof argv[i + 1] === "string") {
      out.dir = argv[++i];
      continue;
    }
    if (token === "--name" && typeof argv[i + 1] === "string") {
      out.name = argv[++i];
      continue;
    }
    if (token === "--template" && typeof argv[i + 1] === "string") {
      const template = argv[++i];
      if (template !== "langchain") {
        return null;
      }
      out.template = template;
      continue;
    }
    if (token === "--yes") {
      out.yes = true;
      continue;
    }
    if (token === "--force") {
      out.force = true;
      continue;
    }
    if (token === "--bootstrap-nodes") {
      out.bootstrapNodes = true;
      continue;
    }
    if (token === "--agent-count" && typeof argv[i + 1] === "string") {
      const raw = Number(argv[++i]);
      if (raw !== 1 && raw !== 2) {
        return null;
      }
      out.agentCount = raw;
      continue;
    }
    if (token === "--environment" && typeof argv[i + 1] === "string") {
      const value = argv[++i].trim().toLowerCase();
      if (value === "development" || value === "test" || value === "production") {
        out.environment = value;
        continue;
      }
      return null;
    }
    if (token === "--server-type" && typeof argv[i + 1] === "string") {
      const value = argv[++i].trim().toLowerCase();
      if (value === "bare" || value === "express") {
        out.serverType = value;
        continue;
      }
      return null;
    }
    return null;
  }
  return out;
}

export function normalizeProjectName(raw?: string): string {
  if (typeof raw !== "string") {
    return "agent-play-agent-starter";
  }
  const normalized = raw.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
  if (normalized.length === 0) {
    return "agent-play-agent-starter";
  }
  return normalized;
}

async function listTemplateFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listTemplateFiles(full);
      files.push(...nested.map((path) => join(entry.name, path)));
      continue;
    }
    files.push(entry.name);
  }
  return files;
}

async function ensureSafeTarget(options: {
  targetDir: string;
  force: boolean;
}): Promise<void> {
  const targetExists = existsSync(options.targetDir);
  if (!targetExists) {
    await mkdir(options.targetDir, { recursive: true });
    return;
  }
  if (options.force) {
    return;
  }
  const existing = await readdir(options.targetDir);
  if (existing.length > 0) {
    throw new Error(
      `Target directory is not empty: ${options.targetDir}. Re-run with --force to overwrite scaffold-managed files.`
    );
  }
}

export function patchEnvContent(options: {
  envContent: string;
  serverUrl: string;
  mainNodeId: string;
  agentNodeIds: string[];
}): string {
  const lines = options.envContent.split(/\r?\n/);
  const updates = new Map<string, string>([
    ["AGENT_PLAY_WEB_UI_URL", options.serverUrl],
    ["AGENT_PLAY_MAIN_NODE_ID", options.mainNodeId],
    ["AGENT_PLAY_AGENT_NODE_ID_1", options.agentNodeIds[0] ?? ""],
    ["AGENT_PLAY_AGENT_NODE_ID_2", options.agentNodeIds[1] ?? ""],
  ]);
  const seen = new Set<string>();
  const next = lines.map((line) => {
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) {
      return line;
    }
    const key = line.slice(0, eqIndex);
    const update = updates.get(key);
    if (update === undefined) {
      return line;
    }
    seen.add(key);
    return `${key}=${update}`;
  });
  for (const [key, value] of updates.entries()) {
    if (!seen.has(key)) {
      next.push(`${key}=${value}`);
    }
  }
  return next.join("\n");
}

async function renderTemplate(options: {
  targetDir: string;
  projectName: string;
  serverType: "bare" | "express";
  force: boolean;
}): Promise<void> {
  const files = await listTemplateFiles(TEMPLATE_ROOT);
  for (const relativePath of files) {
    const templatePath = join(TEMPLATE_ROOT, relativePath);
    const targetPath = join(options.targetDir, relativePath);
    if (!options.force && existsSync(targetPath)) {
      continue;
    }
    await mkdir(dirname(targetPath), { recursive: true });
    const source = await readFile(templatePath, "utf8");
    const serverModule =
      options.serverType === "express" ? "./express-server.js" : "./bare-server.js";
    const content = source
      .replaceAll("__PROJECT_NAME__", options.projectName)
      .replaceAll("__AGENT_NAME__", "Starter Agent")
      .replaceAll("__SERVER_MODULE__", serverModule);
    await writeFile(targetPath, content, "utf8");
  }
}

export async function cmdInitialize(options: {
  argv: string[];
  promptApi: InitializePromptApi;
  runtimeApi: InitializeRuntimeApi;
}): Promise<void> {
  const parsed = parseInitializeArgs(options.argv);
  if (parsed === null) {
    throw new Error(
      "Usage: agent-play initialize [--dir <path>] [--name <project-name>] [--template langchain] [--environment <development|test|production>] [--server-type <bare|express>] [--yes] [--force] [--bootstrap-nodes] [--agent-count <1|2>]"
    );
  }
  const targetDir = resolve(parsed.dir ?? process.cwd());
  const projectName = normalizeProjectName(parsed.name ?? basenameFromPath(targetDir));
  const environment =
    parsed.environment ??
    (parsed.yes ? "development" : await options.promptApi.askEnvironment());
  const serverType =
    parsed.serverType ?? (parsed.yes ? "bare" : await options.promptApi.askServerType());
  const serverUrl = resolveServerUrlForEnvironment(environment);
  const agentCount =
    parsed.agentCount ??
    (parsed.yes ? 1 : await options.promptApi.askAgentCount());
  const bootstrapNodes =
    parsed.bootstrapNodes ??
    (parsed.yes ? false : await options.promptApi.askBootstrapNodes());

  await ensureSafeTarget({ targetDir, force: parsed.force });
  await renderTemplate({
    targetDir,
    projectName,
    serverType,
    force: parsed.force,
  });

  const envExamplePath = join(targetDir, ".env.example");
  const envPath = join(targetDir, ".env");
  if (!existsSync(envPath) && existsSync(envExamplePath)) {
    await writeFile(envPath, await readFile(envExamplePath, "utf8"), "utf8");
  }

  if (bootstrapNodes) {
    const bootstrapped = await options.runtimeApi.bootstrapNodeIds({
      agentCount,
      serverUrl,
    });
    const envContent = existsSync(envPath) ? await readFile(envPath, "utf8") : "";
    const nextEnv = patchEnvContent({
      envContent,
      serverUrl,
      mainNodeId: bootstrapped.mainNodeId,
      agentNodeIds: bootstrapped.agentNodeIds,
    });
    await writeFile(envPath, nextEnv, "utf8");
    console.log(`Bootstrapped main node id: ${bootstrapped.mainNodeId}`);
    for (const [index, nodeId] of bootstrapped.agentNodeIds.entries()) {
      console.log(`Bootstrapped agent node ${String(index + 1)} id: ${nodeId}`);
    }
  } else if (existsSync(envPath)) {
    const envContent = await readFile(envPath, "utf8");
    const nextEnv = patchEnvContent({
      envContent,
      serverUrl,
      mainNodeId: "",
      agentNodeIds: [],
    });
    await writeFile(envPath, nextEnv, "utf8");
  }

  console.log("");
  console.log("Agent starter scaffold created.");
  console.log(`Location: ${targetDir}`);
  console.log("Next steps:");
  console.log(`  cd "${targetDir}"`);
  console.log("  npm install");
  if (!bootstrapNodes) {
    console.log("  npx agent-play create-main-node");
    console.log("  npx agent-play create-agent-node");
    if (agentCount === 2) {
      console.log("  npx agent-play create-agent-node");
    }
    console.log("  copy node ids into .env");
  }
  console.log("  npm run dev");
}

function basenameFromPath(pathValue: string): string {
  const split = pathValue.split(/[\\/]/).filter((part) => part.length > 0);
  return split[split.length - 1] ?? "agent-play-agent-starter";
}
