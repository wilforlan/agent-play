import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { copyFile as copyFileAsync } from "node:fs/promises";
import { extname, join } from "node:path";

const SKIPPABLE_CODES = new Set(["ETIMEDOUT", "EAGAIN", "EBUSY", "ENETDOWN"]);
const DEFAULT_COPY_TIMEOUT_MS = 8_000;

const toErrorCode = (error) => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
};

const toErrorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const isSkippableCopyError = (error) => {
  const code = toErrorCode(error);
  if (code !== undefined && SKIPPABLE_CODES.has(code)) {
    return true;
  }
  return toErrorMessage(error).toLowerCase().includes("timeout");
};

const isCloudPlaceholder = (stats) => {
  return stats.size > 0 && stats.blocks === 0;
};

const isCurrentCopy = (fromStats, toStats) => {
  if (isCloudPlaceholder(toStats)) {
    return true;
  }
  if (toStats.size !== fromStats.size) {
    return false;
  }
  return toStats.mtimeMs >= fromStats.mtimeMs;
};

const withTimeout = async (work, timeoutMs) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        Object.assign(new Error(`copy timed out after ${timeoutMs}ms`), {
          code: "ETIMEDOUT",
        })
      );
    }, timeoutMs);
  });
  try {
    await Promise.race([work, timeout]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

export const copyLocalTree = async (options) => {
  const {
    src,
    dest,
    skipExtensions = [],
    copyTimeoutMs = DEFAULT_COPY_TIMEOUT_MS,
    log = () => undefined,
    copyFile = copyFileAsync,
    statFile = statSync,
  } = options;
  const skippedExtensions = new Set(
    skipExtensions.map((extension) => extension.toLowerCase())
  );
  const result = { copied: 0, skipped: 0, failed: 0 };

  const walk = async (fromDir, toDir) => {
    mkdirSync(toDir, { recursive: true });
    const entries = readdirSync(fromDir, { withFileTypes: true });
    for (const entry of entries) {
      const fromPath = join(fromDir, entry.name);
      const toPath = join(toDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fromPath, toPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const extension = extname(entry.name).toLowerCase();
      if (skippedExtensions.has(extension)) {
        result.skipped += 1;
        continue;
      }
      const stats = statFile(fromPath);
      if (isCloudPlaceholder(stats)) {
        result.skipped += 1;
        log(`copy-tree debug: skip cloud placeholder ${fromPath}`);
        continue;
      }
      if (existsSync(toPath) && isCurrentCopy(stats, statFile(toPath))) {
        result.skipped += 1;
        continue;
      }
      try {
        await withTimeout(copyFile(fromPath, toPath), copyTimeoutMs);
        result.copied += 1;
      } catch (error) {
        if (!isSkippableCopyError(error)) {
          throw error;
        }
        result.failed += 1;
        log(
          `copy-tree debug: skip copy failure ${fromPath} code=${toErrorCode(error) ?? "timeout"} ${toErrorMessage(error)}`
        );
      }
    }
  };

  await walk(src, dest);
  return result;
};
