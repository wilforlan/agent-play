import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

let vendorModuleLoadCount = 0;
const bootstrapMock = vi.fn();

vi.mock("./vendor/main", () => {
  vendorModuleLoadCount += 1;
  return {
    bootstrap: bootstrapMock,
  };
});

describe("WatchBootstrap", () => {
  afterEach(() => {
    vendorModuleLoadCount = 0;
    bootstrapMock.mockReset();
    document.body.innerHTML = "";
  });

  it("does not load vendor module during component import", async () => {
    await import("./watch-bootstrap");
    await Promise.resolve();

    expect(vendorModuleLoadCount).toBe(0);
  });

  it("loads vendor module and bootstraps after mount", async () => {
    const { default: WatchBootstrap } = await import("./watch-bootstrap");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<WatchBootstrap />);
      await Promise.resolve();
    });

    expect(vendorModuleLoadCount).toBe(1);
    expect(bootstrapMock).toHaveBeenCalledTimes(1);
  });
});
