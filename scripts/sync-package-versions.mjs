#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const PACKAGE_PATHS = [
  "package.json",
  "packages/node-tools/package.json",
  "packages/intercom/package.json",
  "packages/sdk/package.json",
  "packages/cli/package.json",
  "packages/play-ui/package.json",
  "packages/web-ui/package.json",
];

/** Maps npm scope name or short alias → path from repo root. */
const WORKSPACE_TO_REL = {
  "@agent-play/node-tools": "packages/node-tools/package.json",
  "node-tools": "packages/node-tools/package.json",
  nodetools: "packages/node-tools/package.json",
  "@agent-play/intercom": "packages/intercom/package.json",
  intercom: "packages/intercom/package.json",
  "@agent-play/sdk": "packages/sdk/package.json",
  sdk: "packages/sdk/package.json",
  "@agent-play/cli": "packages/cli/package.json",
  cli: "packages/cli/package.json",
  "@agent-play/play-ui": "packages/play-ui/package.json",
  "play-ui": "packages/play-ui/package.json",
  playui: "packages/play-ui/package.json",
  "@agent-play/web-ui": "packages/web-ui/package.json",
  "web-ui": "packages/web-ui/package.json",
  webui: "packages/web-ui/package.json",
  root: "package.json",
};

const semverRe = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?$/;

function parseSemver(v) {
  const m = semverRe.exec(v.trim());
  if (!m) {
    throw new Error(`Invalid semver "${v}" (expected MAJOR.MINOR.PATCH or with optional -prerelease)`);
  }
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4],
  };
}

function formatSemver(p) {
  if (p.prerelease) {
    return `${p.major}.${p.minor}.${p.patch}-${p.prerelease}`;
  }
  return `${p.major}.${p.minor}.${p.patch}`;
}

function bump(current, kind) {
  const p = parseSemver(current);
  if (p.prerelease) {
    throw new Error("Bump (patch/minor/major) is not supported when the current version has a prerelease suffix");
  }
  if (kind === "patch") {
    return formatSemver({ ...p, patch: p.patch + 1 });
  }
  if (kind === "minor") {
    return formatSemver({ ...p, minor: p.minor + 1, patch: 0 });
  }
  if (kind === "major") {
    return formatSemver({ major: p.major + 1, minor: 0, patch: 0, prerelease: undefined });
  }
  throw new Error(`Unknown bump kind: ${kind}`);
}

function readRootVersion() {
  const raw = readFileSync(join(root, "package.json"), "utf8");
  const j = JSON.parse(raw);
  if (typeof j.version !== "string") {
    throw new Error("Root package.json has no version field");
  }
  return j.version;
}

function readVersionAt(pathFromRoot) {
  const path = join(root, pathFromRoot);
  const raw = readFileSync(path, "utf8");
  const j = JSON.parse(raw);
  if (typeof j.version !== "string") {
    throw new Error(`${pathFromRoot} has no version field`);
  }
  return j.version;
}

function checkAllMatchRoot() {
  const rootVer = readRootVersion();
  const mismatches = [];
  for (const rel of PACKAGE_PATHS) {
    if (rel === "package.json") {
      continue;
    }
    const v = readVersionAt(rel);
    if (v !== rootVer) {
      mismatches.push(`${rel} (${v} !== ${rootVer})`);
    }
  }
  if (mismatches.length > 0) {
    console.error("Package versions do not match root package.json:");
    for (const m of mismatches) {
      console.error(`  ${m}`);
    }
    return false;
  }
  return true;
}

function checkAllSemverFieldsValid() {
  const bad = [];
  for (const rel of PACKAGE_PATHS) {
    try {
      parseSemver(readVersionAt(rel));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      bad.push(`${rel}: ${msg}`);
    }
  }
  if (bad.length > 0) {
    console.error("Invalid or missing semver in package.json:");
    for (const b of bad) {
      console.error(`  ${b}`);
    }
    return false;
  }
  return true;
}

function setVersion(pathFromRoot, version) {
  const path = join(root, pathFromRoot);
  const raw = readFileSync(path, "utf8");
  const j = JSON.parse(raw);
  j.version = version;
  writeFileSync(path, `${JSON.stringify(j, null, 2)}\n`, "utf8");
}

function resolveWorkspace(id) {
  const raw = id.trim();
  if (raw.length === 0) {
    throw new Error("Workspace id is empty");
  }
  const direct = WORKSPACE_TO_REL[raw];
  if (direct) {
    return direct;
  }
  const lower = raw.toLowerCase();
  const byLower = WORKSPACE_TO_REL[lower];
  if (byLower) {
    return byLower;
  }
  const known = Object.keys(WORKSPACE_TO_REL)
    .filter((k) => !k.includes("@"))
    .sort();
  throw new Error(
    `Unknown workspace "${id}". Use one of: ${known.join(", ")}, or @agent-play/intercom, @agent-play/sdk, @agent-play/cli, @agent-play/play-ui, @agent-play/web-ui`
  );
}

function parseArgv(argv) {
  const rest = [];
  let workspace = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--check-semver") {
      return { mode: "check-semver" };
    }
    if (a === "--check") {
      return { mode: "check" };
    }
    if (a === "-h" || a === "--help") {
      return { mode: "help" };
    }
    if (a === "--workspace" || a === "-w") {
      const next = argv[i + 1];
      if (typeof next !== "string" || next.startsWith("-")) {
        throw new Error(`Missing value after ${a}`);
      }
      workspace = next;
      i += 1;
      continue;
    }
    rest.push(a);
  }
  return { mode: "run", workspace, rest };
}

function printHelp(exitCode) {
  console.error(`usage:
  npm run version:packages -- <version>
  npm run version:packages -- patch | minor | major
  npm run version:packages -- --workspace <name> <version>
  npm run version:packages -- -w <name> patch | minor | major
  node scripts/sync-package-versions.mjs --check
  node scripts/sync-package-versions.mjs --check-semver

  --check         Exit 0 if root and all workspace package.json versions match; else exit 1.
  --check-semver  Exit 0 if every tracked package.json has a valid semver version; else exit 1.

Without --workspace: set the same semver on the root package and:
  @agent-play/node-tools, @agent-play/intercom, @agent-play/sdk, @agent-play/cli, @agent-play/play-ui, @agent-play/web-ui

With --workspace / -w: set the version only in that package.json (aliases: sdk, cli, play-ui, web-ui, root, or @agent-play/...).

Examples:
  npm run version:packages -- 0.2.0
  npm run version:packages -- patch
  npm run version:packages -- -w sdk patch
  npm run version:packages -- --workspace @agent-play/cli 1.4.0`);
  process.exit(exitCode);
}

const parsed = parseArgv(process.argv.slice(2));

if (parsed.mode === "check-semver") {
  process.exit(checkAllSemverFieldsValid() ? 0 : 1);
}

if (parsed.mode === "check") {
  process.exit(checkAllMatchRoot() ? 0 : 1);
}

if (parsed.mode === "help") {
  printHelp(0);
}

if (parsed.mode !== "run") {
  printHelp(1);
}

const { workspace, rest } = parsed;

if (rest.length !== 1) {
  console.error("error: expected exactly one version argument: <semver> | patch | minor | major");
  printHelp(1);
}

const arg = rest[0];

let target;

if (arg === "patch" || arg === "minor" || arg === "major") {
  const base =
    workspace === null ? readRootVersion() : readVersionAt(resolveWorkspace(workspace));
  target = bump(base, arg);
} else {
  parseSemver(arg);
  target = arg.trim();
}

if (workspace === null) {
  for (const rel of PACKAGE_PATHS) {
    setVersion(rel, target);
  }
  console.log(`Set version ${target} in ${PACKAGE_PATHS.length} package.json files.`);
} else {
  const rel = resolveWorkspace(workspace);
  setVersion(rel, target);
  console.log(`Set version ${target} in ${rel} only.`);
}
