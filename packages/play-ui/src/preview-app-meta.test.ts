import { describe, expect, it } from "vitest";
import { getPreviewAppMeta } from "./preview-app-meta.js";

describe("getPreviewAppMeta", () => {
  it("exposes a semver-like version string", () => {
    expect(getPreviewAppMeta().version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("exposes an https repository URL", () => {
    expect(getPreviewAppMeta().repoUrl).toMatch(/^https:\/\//);
  });
});
