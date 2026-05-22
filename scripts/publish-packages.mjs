#!/usr/bin/env node
/**
 * publish-packages.mjs
 *
 * Publish agent-play packages to npm in dependency order:
 *   @agent-play/node-tools → @agent-play/intercom → @agent-play/sdk
 *      → @agent-play/cli → @agent-play/play-ui
 *
 * Safe-by-default:
 *   - Refuses to run if the git working tree is dirty (override with --allow-dirty).
 *   - Verifies you are logged into npm (override with --dry-run).
 *   - Probes the registry for each package@version before publishing so a
 *     conflict aborts cleanly instead of midway through the chain.
 *   - Builds each package in dependency order before publishing.
 *
 * Usage:
 *   node scripts/publish-packages.mjs [options]
 *
 * Options:
 *   --packages <list>    Comma-separated subset of the publishable set:
 *                        node-tools,intercom,sdk,cli,play-ui
 *                        Default: all five, in dependency order.
 *   --tag <tag>          Pass --tag to npm publish (default: latest).
 *   --otp <code>         Pass --otp to npm publish for 2FA accounts.
 *   --dry-run            Pass --dry-run to npm publish; also skips the
 *                        whoami and registry-conflict checks.
 *   --no-build           Skip the build step (assumes dist/ is fresh).
 *   --skip-existing      Skip packages whose <name>@<version> already exists
 *                        on the registry (default: fail loudly).
 *   --allow-dirty        Allow publishing from a dirty git tree.
 *   --yes                Skip the interactive confirmation prompt.
 *   -h, --help           Print this help and exit.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");

const PUBLISHABLE_ORDER = ["node-tools", "intercom", "sdk", "cli", "play-ui"];
const PUBLISHABLE_SET = new Set(PUBLISHABLE_ORDER);

function fullPackageName(shortName) {
  return `@agent-play/${shortName}`;
}

function packageDir(shortName) {
  return join(REPO_ROOT, "packages", shortName);
}

function packageJsonPath(shortName) {
  return join(packageDir(shortName), "package.json");
}

function readPackageJson(shortName) {
  const raw = readFileSync(packageJsonPath(shortName), "utf8");
  return JSON.parse(raw);
}

function usage() {
  return `usage: node scripts/publish-packages.mjs [options]

Publishes @agent-play/* packages to npm in dependency order.

Options:
  --packages <list>    Subset of: ${PUBLISHABLE_ORDER.join(",")}
  --tag <tag>          dist-tag for npm publish (default: latest)
  --otp <code>         OTP token for 2FA-protected npm accounts
  --dry-run            Pass --dry-run to npm publish; skip whoami/conflict checks
  --no-build           Skip the per-package build step
  --skip-existing      Skip packages whose version is already on the registry
  --allow-dirty        Allow publishing from a dirty git tree
  --yes                Skip the confirmation prompt
  -h, --help           Show this message

Examples:
  node scripts/publish-packages.mjs --dry-run
  node scripts/publish-packages.mjs --packages sdk,cli
  node scripts/publish-packages.mjs --tag next --yes
`;
}

function parseArgs(argv) {
  const out = {
    packages: PUBLISHABLE_ORDER.slice(),
    tag: "latest",
    otp: null,
    dryRun: false,
    build: true,
    skipExisting: false,
    allowDirty: false,
    yes: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      out.help = true;
    } else if (a === "--packages") {
      const v = argv[++i];
      if (typeof v !== "string" || v.trim().length === 0) {
        throw new Error("--packages requires a comma-separated list");
      }
      const picked = v
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const p of picked) {
        if (!PUBLISHABLE_SET.has(p)) {
          throw new Error(
            `Unknown package "${p}". Allowed: ${PUBLISHABLE_ORDER.join(", ")}`
          );
        }
      }
      out.packages = PUBLISHABLE_ORDER.filter((p) => picked.includes(p));
      if (out.packages.length === 0) {
        throw new Error("--packages selected nothing");
      }
    } else if (a === "--tag") {
      const v = argv[++i];
      if (typeof v !== "string" || v.trim().length === 0) {
        throw new Error("--tag requires a value");
      }
      out.tag = v.trim();
    } else if (a === "--otp") {
      const v = argv[++i];
      if (typeof v !== "string" || v.trim().length === 0) {
        throw new Error("--otp requires a value");
      }
      out.otp = v.trim();
    } else if (a === "--dry-run") {
      out.dryRun = true;
    } else if (a === "--no-build") {
      out.build = false;
    } else if (a === "--skip-existing") {
      out.skipExisting = true;
    } else if (a === "--allow-dirty") {
      out.allowDirty = true;
    } else if (a === "--yes" || a === "-y") {
      out.yes = true;
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return out;
}

function run(command, args, opts = {}) {
  const cwd = opts.cwd ?? REPO_ROOT;
  const label = opts.label ?? `${command} ${args.join(" ")}`;
  console.log(`\n[${label}]`);
  console.log(`        cwd: ${cwd}`);
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      stdio: opts.captureStdout ? ["inherit", "pipe", "inherit"] : "inherit",
      env: opts.env ?? process.env,
    });
    let stdout = "";
    if (opts.captureStdout && child.stdout !== null) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
        process.stdout.write(chunk);
      });
    }
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise({ code, stdout });
      } else {
        rejectPromise(
          new Error(`${label} exited with code ${code ?? "null"}`)
        );
      }
    });
  });
}

function runSilent(command, args, opts = {}) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: opts.cwd ?? REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: opts.env ?? process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (c) => {
      stdout += c;
    });
    child.stderr.on("data", (c) => {
      stderr += c;
    });
    child.on("error", () => {
      resolvePromise({ code: -1, stdout, stderr });
    });
    child.on("close", (code) => {
      resolvePromise({ code: code ?? -1, stdout, stderr });
    });
  });
}

async function ensureCleanGitTree() {
  const res = await runSilent("git", ["status", "--porcelain"]);
  if (res.code !== 0) {
    throw new Error(
      `git status failed: ${res.stderr.trim() || "unknown error"}`
    );
  }
  const dirty = res.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (dirty.length > 0) {
    const preview = dirty.slice(0, 10).join("\n  ");
    const extra = dirty.length > 10 ? `\n  …and ${dirty.length - 10} more` : "";
    throw new Error(
      `Git working tree is not clean (${dirty.length} entries). Commit or stash, or pass --allow-dirty.\n  ${preview}${extra}`
    );
  }
}

async function ensureNpmLogin() {
  const res = await runSilent("npm", ["whoami"]);
  if (res.code !== 0) {
    throw new Error(
      `npm whoami failed: ${res.stderr.trim() || "not logged in"}. Run \`npm login\`, or use --dry-run.`
    );
  }
  return res.stdout.trim();
}

async function probeRegistry(name, version) {
  const res = await runSilent("npm", [
    "view",
    `${name}@${version}`,
    "version",
    "--json",
  ]);
  if (res.code === 0) {
    const trimmed = res.stdout.trim();
    if (trimmed.length === 0) {
      return { exists: false };
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "string" && parsed.length > 0) {
        return { exists: true };
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { exists: true };
      }
      return { exists: false };
    } catch {
      return { exists: trimmed.length > 0 };
    }
  }
  const combined = `${res.stdout}\n${res.stderr}`;
  if (/E404|not found/i.test(combined)) {
    return { exists: false };
  }
  throw new Error(
    `npm view ${name}@${version} failed: ${res.stderr.trim() || combined.trim()}`
  );
}

async function confirm(prompt) {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`${prompt} [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

function publishCommandArgs(shortName, { tag, otp, dryRun }) {
  const args = ["publish", "-w", fullPackageName(shortName), "--access", "public"];
  if (tag !== "latest") {
    args.push("--tag", tag);
  }
  if (otp !== null) {
    args.push("--otp", otp);
  }
  if (dryRun) {
    args.push("--dry-run");
  }
  return args;
}

async function buildPackage(shortName) {
  await run("npm", ["run", "build", "-w", fullPackageName(shortName)], {
    label: `build ${fullPackageName(shortName)}`,
  });
}

async function publishPackage(shortName, opts) {
  await run("npm", publishCommandArgs(shortName, opts), {
    label: `publish ${fullPackageName(shortName)}${opts.dryRun ? " (dry-run)" : ""}`,
  });
}

function verifyDistExists(shortName) {
  const dist = join(packageDir(shortName), "dist");
  if (!existsSync(dist)) {
    throw new Error(
      `dist/ missing for ${fullPackageName(shortName)} (${dist}). Run without --no-build, or build manually.`
    );
  }
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.error("");
    console.error(usage());
    process.exitCode = 1;
    return;
  }
  if (args.help) {
    console.log(usage());
    return;
  }

  console.log("agent-play publish-packages");
  console.log(`  repo root      : ${REPO_ROOT}`);
  console.log(`  packages       : ${args.packages.map(fullPackageName).join(", ")}`);
  console.log(`  tag            : ${args.tag}`);
  console.log(`  dry-run        : ${args.dryRun ? "yes" : "no"}`);
  console.log(`  build first    : ${args.build ? "yes" : "no"}`);
  console.log(`  skip existing  : ${args.skipExisting ? "yes" : "no"}`);
  console.log(`  allow dirty    : ${args.allowDirty ? "yes" : "no"}`);
  if (args.otp !== null) {
    console.log("  otp            : provided");
  }

  if (!args.allowDirty && !args.dryRun) {
    await ensureCleanGitTree();
  }

  if (!args.dryRun) {
    const who = await ensureNpmLogin();
    console.log(`  npm user       : ${who}`);
  }

  const plan = [];
  for (const shortName of args.packages) {
    const pkg = readPackageJson(shortName);
    const name = pkg.name;
    const version = pkg.version;
    if (typeof name !== "string" || typeof version !== "string") {
      throw new Error(
        `Invalid package.json for ${shortName}: missing name or version`
      );
    }
    let action = "publish";
    if (!args.dryRun) {
      const probe = await probeRegistry(name, version);
      if (probe.exists) {
        if (args.skipExisting) {
          action = "skip (exists)";
        } else {
          throw new Error(
            `${name}@${version} is already published. Bump the version (npm run version:packages -- -w ${shortName} patch) or pass --skip-existing.`
          );
        }
      }
    }
    plan.push({ shortName, name, version, action });
  }

  console.log("\nPlan:");
  for (const row of plan) {
    console.log(`  ${row.action.padEnd(15)} ${row.name}@${row.version}`);
  }

  const actionable = plan.filter((row) => row.action === "publish");
  if (actionable.length === 0) {
    console.log("\nNothing to publish. Done.");
    return;
  }

  if (!args.yes) {
    const ok = await confirm(
      args.dryRun
        ? `\nProceed with DRY-RUN publish of ${actionable.length} package(s)?`
        : `\nReally publish ${actionable.length} package(s) to npm?`
    );
    if (!ok) {
      console.log("Aborted.");
      process.exitCode = 1;
      return;
    }
  }

  if (args.build) {
    for (const row of actionable) {
      await buildPackage(row.shortName);
    }
  } else {
    for (const row of actionable) {
      verifyDistExists(row.shortName);
    }
  }

  const published = [];
  const skipped = [];
  for (const row of plan) {
    if (row.action !== "publish") {
      skipped.push(row);
      continue;
    }
    await publishPackage(row.shortName, {
      tag: args.tag,
      otp: args.otp,
      dryRun: args.dryRun,
    });
    published.push(row);
  }

  console.log("\nSummary:");
  for (const row of published) {
    console.log(
      `  ${args.dryRun ? "would publish" : "published   "} ${row.name}@${row.version}`
    );
  }
  for (const row of skipped) {
    console.log(`  ${row.action.padEnd(15)} ${row.name}@${row.version}`);
  }
  console.log(`\nDone${args.dryRun ? " (dry-run)" : ""}.`);
}

main().catch((err) => {
  console.error("\nFailed:", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
