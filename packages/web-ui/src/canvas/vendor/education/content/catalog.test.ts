import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EDUCATION_CONTENT_FACULTIES,
  EDUCATION_TUITION_APW_BY_TIER,
  listAllPaths,
} from "./catalog.js";

const contentRoot = dirname(fileURLToPath(import.meta.url));

describe("education content pack", () => {
  it("indexes four faculties with three tiered paths each", () => {
    expect(EDUCATION_CONTENT_FACULTIES).toHaveLength(4);
    for (const faculty of EDUCATION_CONTENT_FACULTIES) {
      expect(faculty.paths).toHaveLength(3);
      const tiers = faculty.paths.map((p) => p.tier).sort();
      expect(tiers).toEqual(["advanced", "foundation", "intermediate"]);
    }
  });

  it("prices paths by complexity tier", () => {
    for (const pathMeta of listAllPaths()) {
      expect(pathMeta.tuitionApw).toBe(
        EDUCATION_TUITION_APW_BY_TIER[pathMeta.tier]
      );
      expect(pathMeta.lessons.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("points every outline and lesson at an existing markdown file", () => {
    for (const pathMeta of listAllPaths()) {
      expect(existsSync(join(contentRoot, pathMeta.outlineFile))).toBe(true);
      for (const lesson of pathMeta.lessons) {
        expect(existsSync(join(contentRoot, lesson.file))).toBe(true);
      }
    }
  });
});
