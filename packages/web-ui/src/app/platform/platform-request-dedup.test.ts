import { describe, expect, it, vi } from "vitest";
import { withInflightDedup } from "./platform-request-dedup";

describe("withInflightDedup", () => {
  it("reuses the same in-flight promise for duplicate keys", async () => {
    const execute = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => setTimeout(() => resolve("ok"), 10))
    );
    const first = withInflightDedup("k1", execute);
    const second = withInflightDedup("k1", execute);
    expect(execute).toHaveBeenCalledTimes(1);
    await expect(Promise.all([first, second])).resolves.toEqual(["ok", "ok"]);
  });

  it("starts a new request after the previous one completes", async () => {
    const execute = vi.fn().mockResolvedValue("ok");
    await withInflightDedup("k2", execute);
    await withInflightDedup("k2", execute);
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
