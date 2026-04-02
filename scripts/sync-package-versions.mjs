#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const PACKAGE_PATHS = [
  "package.json",
  "packages/sdk/package.json",
  "packages/cli/package.json",
  "packages/play-ui/package.json",
  "packages/web-ui/package.json",
];

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

function setVersion(pathFromRoot, version) {
  const path = join(root, pathFromRoot);
  const raw = readFileSync(path, "utf8");
  const j = JSON.parse(raw);
  j.version = version;
  writeFileSync(path, `${JSON.stringify(j, null, 2)}\n`, "utf8");
}

const arg = process.argv[2];

if (arg === "--check") {
  process.exit(checkAllMatchRoot() ? 0 : 1);
}

if (arg === undefined || arg === "-h" || arg === "--help") {
  console.error(`usage: npm run version:packages -- <version>
       npm run version:packages -- patch | minor | major
       node scripts/sync-package-versions.mjs --check

  --check   Exit 0 if root and all workspace package.json versions match; else exit 1.

Sets the same semver on the root package and:
  @agent-play/sdk, @agent-play/cli, @agent-play/play-ui, @agent-play/web-ui

Examples:
  npm run version:packages -- 0.2.0
  npm run version:packages -- patch`);
  process.exit(arg === undefined ? 1 : 0);
}

let target;

if (arg === "patch" || arg === "minor" || arg === "major") {
  target = bump(readRootVersion(), arg);
} else {
  parseSemver(arg);
  target = arg.trim();
}

for (const rel of PACKAGE_PATHS) {
  setVersion(rel, target);
}

console.log(`Set version ${target} in ${PACKAGE_PATHS.length} package.json files.`);
