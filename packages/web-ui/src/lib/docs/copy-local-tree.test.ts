import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { copyFile as copyFileAsync } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { copyLocalTree } from "../../../scripts/copy-local-tree.mjs";

const getTempDir = (label: string): string => {
  return mkdtempSync(join(tmpdir(), `copy-local-tree-${label}-`));
};

describe("copy local tree", () => {
  it("copies markdown into dest even when typedoc html is skipped", async () => {
    const root = getTempDir("skip-html");
    const src = join(root, "src");
    const dest = join(root, "dest");
    mkdirSync(join(src, "api-reference"), { recursive: true });
    writeFileSync(join(src, "README.md"), "# docs\n");
    writeFileSync(join(src, "api-reference", "index.html"), "<html></html>");

    const result = await copyLocalTree({
      src,
      dest,
      skipExtensions: [".html"],
    });

    expect(readFileSync(join(dest, "README.md"), "utf8")).toBe("# docs\n");
    expect(result.copied).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it("logs a debug line and continues when a file copy times out", async () => {
    const root = getTempDir("timeout");
    const src = join(root, "src");
    const dest = join(root, "dest");
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, "ok.md"), "ok");
    writeFileSync(join(src, "stuck.png"), "png");
    const logs: string[] = [];

    const result = await copyLocalTree({
      src,
      dest,
      log: (message) => {
        logs.push(message);
      },
      copyFile: async (from, to) => {
        if (from.endsWith("stuck.png")) {
          throw Object.assign(new Error("connection timed out"), {
            code: "ETIMEDOUT",
          });
        }
        await copyFileAsync(from, to);
      },
    });

    expect(readFileSync(join(dest, "ok.md"), "utf8")).toBe("ok");
    expect(result.copied).toBe(1);
    expect(result.failed).toBe(1);
    expect(logs.some((line) => line.includes("debug") && line.includes("ETIMEDOUT"))).toBe(
      true
    );
  });

  it("does not wait a full minute when a copy hangs", async () => {
    const root = getTempDir("hang");
    const src = join(root, "src");
    const dest = join(root, "dest");
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, "hung.md"), "hung");
    const logs: string[] = [];
    const startedAt = Date.now();

    const result = await copyLocalTree({
      src,
      dest,
      copyTimeoutMs: 40,
      log: (message) => {
        logs.push(message);
      },
      copyFile: async () => {
        await new Promise(() => undefined);
      },
    });

    expect(Date.now() - startedAt).toBeLessThan(1500);
    expect(result.failed).toBe(1);
    expect(logs.some((line) => line.includes("debug") && line.includes("ETIMEDOUT"))).toBe(
      true
    );
  });

  it("does not recopy a dest file that already matches source size and mtime", async () => {
    const root = getTempDir("skip-current");
    const src = join(root, "src");
    const dest = join(root, "dest");
    mkdirSync(src, { recursive: true });
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(src, "guide.md"), "same");
    writeFileSync(join(dest, "guide.md"), "same");
    const copyCalls: string[] = [];

    const result = await copyLocalTree({
      src,
      dest,
      copyFile: async (from, to) => {
        copyCalls.push(`${from}->${to}`);
        await copyFileAsync(from, to);
      },
    });

    expect(copyCalls).toEqual([]);
    expect(result.copied).toBe(0);
    expect(result.skipped).toBe(1);
    expect(readFileSync(join(dest, "guide.md"), "utf8")).toBe("same");
  });

  it("recopies when dest is older than source", async () => {
    const root = getTempDir("stale-dest");
    const src = join(root, "src");
    const dest = join(root, "dest");
    mkdirSync(src, { recursive: true });
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(src, "guide.md"), "new");
    writeFileSync(join(dest, "guide.md"), "old");
    const past = new Date("2020-01-01T00:00:00Z");
    utimesSync(join(dest, "guide.md"), past, past);
    const copyCalls: string[] = [];

    const result = await copyLocalTree({
      src,
      dest,
      copyFile: async (from, to) => {
        copyCalls.push(`${from}->${to}`);
        await copyFileAsync(from, to);
      },
    });

    expect(copyCalls).toHaveLength(1);
    expect(result.copied).toBe(1);
    expect(readFileSync(join(dest, "guide.md"), "utf8")).toBe("new");
  });

  it("does not overwrite a dest file that is an iCloud placeholder", async () => {
    const root = getTempDir("dest-placeholder");
    const src = join(root, "src");
    const dest = join(root, "dest");
    mkdirSync(src, { recursive: true });
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(src, "guide.md"), "source");
    writeFileSync(join(dest, "guide.md"), "dest");
    const destPath = join(dest, "guide.md");
    const copyCalls: string[] = [];

    const result = await copyLocalTree({
      src,
      dest,
      statFile: (path) => {
        const stats = {
          size: path === destPath ? 5 : 6,
          blocks: path === destPath ? 0 : 8,
          mtimeMs: path === destPath ? 1 : 2,
        };
        return stats;
      },
      copyFile: async (from, to) => {
        copyCalls.push(`${from}->${to}`);
        await copyFileAsync(from, to);
      },
    });

    expect(copyCalls).toEqual([]);
    expect(result.copied).toBe(0);
    expect(result.skipped).toBe(1);
    expect(readFileSync(destPath, "utf8")).toBe("dest");
  });
});
