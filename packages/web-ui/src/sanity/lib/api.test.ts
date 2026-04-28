import { describe, expect, it, vi } from "vitest";

describe("sanity api config", () => {
  it("throws when required env vars are missing", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SANITY_PROJECT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_SANITY_DATASET", "");
    vi.stubEnv("NEXT_PUBLIC_SANITY_API_VERSION", "");

    await expect(import("./api.ts")).rejects.toThrow(
      "Missing environment variable: NEXT_PUBLIC_SANITY_DATASET",
    );
  });

  it("exports configured values when env vars exist", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SANITY_PROJECT_ID", "project123");
    vi.stubEnv("NEXT_PUBLIC_SANITY_DATASET", "production");
    vi.stubEnv("NEXT_PUBLIC_SANITY_API_VERSION", "2025-01-01");

    const mod = await import("./api.ts");

    expect(mod.projectId).toBe("project123");
    expect(mod.dataset).toBe("production");
    expect(mod.apiVersion).toBe("2025-01-01");
    expect(mod.studioUrl).toBe("/sanity/studio");
  });
});
