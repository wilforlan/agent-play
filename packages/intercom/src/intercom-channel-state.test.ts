import { describe, expect, it, beforeEach } from "vitest";
import {
  openOrReuseIntercomChannel,
  resetIntercomChannelStateForTests,
} from "./intercom-channel-state.js";

describe("openOrReuseIntercomChannel", () => {
  beforeEach(() => {
    resetIntercomChannelStateForTests();
  });

  it("marks first open as opened", () => {
    expect(openOrReuseIntercomChannel("k1")).toBe("opened");
  });

  it("marks subsequent opens as reused", () => {
    expect(openOrReuseIntercomChannel("k1")).toBe("opened");
    expect(openOrReuseIntercomChannel("k1")).toBe("reused");
  });
});
