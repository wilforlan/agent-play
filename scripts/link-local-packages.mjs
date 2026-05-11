#!/usr/bin/env node
/**
 * link-local-packages.mjs
 *
 * Link agent-play packages (e.g. @agent-play/sdk, @agent-play/intercom,
 * @agent-play/node-tools) into a downstream project for local development
 * using `npm link`. By default this is the SDK trio; pass --packages to
 * change the set.
 *
 * Default flow:
 *   1. Build each requested package in the given order (dependency order).
 *   2. Register a global link for each (`npm link` inside the package).
 *   3. If --consumer <path> is provided, run `npm link <pkg1> <pkg2> ...`
 *      in that directory so it resolves the packages to your local builds.
 *
 * --unlink reverses the state: removes the consumer's links and the global
 *   registrations, then runs `npm install` in the consumer to restore deps.
 *
 * Note: running `npm install` in the consumer later will replace the
 *   symlinks with whatever its package.json declares (e.g. a `file:` path).
 *   Re-run this script after such installs to restore live links.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");

const DEFAULT_PACKAGES = ["node-tools", "intercom", "sdk"];
const VALID_PACKAGE_DIRS = new Set([
  "node-tools",
  "intercom",
  "sdk",
  "cli",
  "agents",
  "play-ui",
  "web-ui",
]);

function parseArgs(argv) {
  const out = {
    packages: DEFAULT_PACKAGES.slice(),
    consumer: null,
    build: true,
    unlink: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      out.help = true;
    } else if (a === "--packages") {
      const v = argv[++i];
      if (typeof v !== "string" || v.trim().length === 0) {
        throw new Error("--packages requires a comma-separated list");
      }
      out.packages = v
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else if (a === "--consumer") {
      const v = argv[++i];
      if (typeof v !== "string" || v.trim().length === 0) {
        throw new Error("--consumer requires a path");
      }
      out.consumer = v;
    } else if (a === "--no-build") {
      out.build = false;
    } else if (a === "--build") {
      out.build = true;
    } else if (a === "--unlink") {
      out.unlink = true;
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return out;
}

function usage() {
  return [
    "Link agent-play packages into a downstream project for local development.",
    "",
    "Usage:",
    "  node scripts/link-local-packages.mjs [options]",
    "",
    "Options:",
    "  --packages <list>     Comma-separated package short names.",
    "                        Default: node-tools,intercom,sdk",
    "                        Order is also the build order.",
    "  --consumer <path>     Downstream project path; runs `npm link <pkgs>` there.",
    "  --no-build            Skip the per-package build step.",
    "  --unlink              Remove links instead of creating them.",
    "  --help, -h            Show this help.",
    "",
    "Examples:",
    "  node scripts/link-local-packages.mjs --consumer ~/Documents/agent-service",
    "  node scripts/link-local-packages.mjs --no-build --consumer ../agent-service",
    "  node scripts/link-local-packages.mjs --unlink --consumer ../agent-service",
    "  node scripts/link-local-packages.mjs --packages node-tools,intercom,sdk,cli \\",
    "      --consumer ~/Documents/agent-service",
  ].join("\n");
}

function expandHome(p) {
  if (p === "~") {
    return process.env.HOME ?? "";
  }
  if (p.startsWith("~/")) {
    return `${process.env.HOME ?? ""}/${p.slice(2)}`;
  }
  return p;
}

function resolveConsumerPath(p) {
  if (p === null) {
    return null;
  }
  const expanded = expandHome(p);
  const abs = isAbsolute(expanded) ? expanded : resolve(process.cwd(), expanded);
  if (!existsSync(abs)) {
    throw new Error(`Consumer path does not exist: ${abs}`);
  }
  if (!existsSync(resolve(abs, "package.json"))) {
    throw new Error(
      `Consumer path is not an npm project (no package.json): ${abs}`
    );
  }
  return abs;
}

function fullPackageName(short) {
  return `@agent-play/${short}`;
}

function packageDir(short) {
  if (!VALID_PACKAGE_DIRS.has(short)) {
    throw new Error(
      `Unknown package short name "${short}". Known: ${[...VALID_PACKAGE_DIRS].join(", ")}`
    );
  }
  const dir = resolve(REPO_ROOT, "packages", short);
  if (!existsSync(resolve(dir, "package.json"))) {
    throw new Error(`No package.json at ${dir}`);
  }
  return dir;
}

function runStep(label) {
  return (cmd, args, cwd) => {
    const display = `${cmd} ${args.join(" ")}`;
    console.log(`\n[${label}] ${display}`);
    console.log(`        cwd: ${cwd}`);
    return new Promise((resolveP, rejectP) => {
      const child = spawn(cmd, args, {
        cwd,
        stdio: "inherit",
        shell: false,
      });
      child.on("error", rejectP);
      child.on("exit", (code) => {
        if (code === 0) {
          resolveP();
        } else {
          rejectP(new Error(`${display} exited with code ${String(code)}`));
        }
      });
    });
  };
}

async function buildPackages(packages) {
  const run = runStep("build");
  for (const short of packages) {
    await run("npm", ["run", "build"], packageDir(short));
  }
}

async function registerGlobalLinks(packages) {
  const run = runStep("link");
  for (const short of packages) {
    await run("npm", ["link"], packageDir(short));
  }
}

async function linkIntoConsumer(packages, consumerDir) {
  const run = runStep("consumer");
  const fulls = packages.map(fullPackageName);
  await run("npm", ["link", ...fulls], consumerDir);
}

async function removeConsumerLinks(packages, consumerDir) {
  const run = runStep("unlink");
  const fulls = packages.map(fullPackageName);
  try {
    await run("npm", ["unlink", "--no-save", ...fulls], consumerDir);
  } catch (err) {
    console.warn(
      `(consumer unlink reported an error, continuing): ${err instanceof Error ? err.message : String(err)}`
    );
  }
  await run("npm", ["install"], consumerDir);
}

async function removeGlobalLinks(packages) {
  const run = runStep("unlink");
  for (const short of packages.slice().reverse()) {
    try {
      await run("npm", ["unlink"], packageDir(short));
    } catch (err) {
      console.warn(
        `(global unlink for ${short} reported an error, continuing): ${err instanceof Error ? err.message : String(err)}`
      );
    }
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

  const consumerDir = resolveConsumerPath(args.consumer);
  const fulls = args.packages.map(fullPackageName);

  console.log("agent-play link-local-packages");
  console.log(`  repo root : ${REPO_ROOT}`);
  console.log(`  packages  : ${fulls.join(", ")}`);
  console.log(`  consumer  : ${consumerDir ?? "(none — global links only)"}`);
  console.log(`  build     : ${args.build ? "yes" : "no"}`);
  console.log(`  mode      : ${args.unlink ? "unlink" : "link"}`);

  if (args.unlink) {
    if (consumerDir !== null) {
      await removeConsumerLinks(args.packages, consumerDir);
    }
    await removeGlobalLinks(args.packages);
    console.log("\nDone: unlink complete.");
    return;
  }

  if (args.build) {
    await buildPackages(args.packages);
  } else {
    console.log("\nSkipping build (--no-build).");
  }

  await registerGlobalLinks(args.packages);

  if (consumerDir !== null) {
    await linkIntoConsumer(args.packages, consumerDir);
    console.log(`\nDone: linked ${fulls.join(", ")} into ${consumerDir}.`);
    console.log(
      "Tip: rerun this script after `npm install` in the consumer to restore the symlinks."
    );
  } else {
    console.log(`\nDone: registered global links for ${fulls.join(", ")}.`);
    console.log("To wire a consumer project, run there:");
    console.log(`  npm link ${fulls.join(" ")}`);
  }
}

main().catch((err) => {
  console.error("\nFailed:", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
