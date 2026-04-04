import { existsSync } from "node:fs";
import { join } from "node:path";

import { getDocsRoot } from "./paths";
import {
  slugSegmentIsSafe,
  urlSlugSegmentsToDefaultMdPath,
} from "./slug-url";

export function slugSegmentsAreSafe(segments: string[]): boolean {
  return segments.every(slugSegmentIsSafe);
}

export function resolveSlugToRelativeMdPath(segments: string[]): string | null {
  if (!slugSegmentsAreSafe(segments)) {
    return null;
  }
  const root = getDocsRoot();
  if (segments.length === 0) {
    const readme = join(root, "README.md");
    return existsSync(readme) ? "README.md" : null;
  }

  const asFile = urlSlugSegmentsToDefaultMdPath(segments);
  if (existsSync(join(root, asFile))) {
    return asFile;
  }

  const asFolderReadme = join(
    segments.join("/"),
    "README.md",
  ).replace(/\\/g, "/");
  if (existsSync(join(root, asFolderReadme))) {
    return asFolderReadme;
  }

  return null;
}
