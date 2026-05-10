import { describe, expect, it } from "vitest";
import rootPackage from "../../../../../package.json";
import { getPreviewAppMeta } from "./preview-app-meta.js";

describe("getPreviewAppMeta", () => {
  it("exposes a semver-like version string", () => {
    expect(getPreviewAppMeta().version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("matches the monorepo root package.json version when env override is absent", () => {
    expect(getPreviewAppMeta().version).toBe(rootPackage.version);
  });

  it("exposes an https repository URL", () => {
    expect(getPreviewAppMeta().repoUrl).toMatch(/^https:\/\//);
  });
});
