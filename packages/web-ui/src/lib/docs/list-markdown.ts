import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

import { getDocsRoot } from "./paths.js";

export async function listMarkdownRelativePaths(): Promise<string[]> {
  const root = getDocsRoot();
  const out: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        await walk(p);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        out.push(relative(root, p).replace(/\\/g, "/"));
      }
    }
  }

  try {
    await walk(root);
  } catch {
    return [];
  }
  return out.sort((a, b) => a.localeCompare(b));
}
