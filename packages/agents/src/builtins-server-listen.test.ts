import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getBuiltinsListenOptions } from "./builtins-server-listen.js";

describe("getBuiltinsListenOptions", () => {
  const envKeys = [
    "AGENT_PLAY_BUILTINS_PORT",
    "AGENT_PLAY_BUILTINS_HOST",
  ] as const;
  let snapshot: Partial<Record<(typeof envKeys)[number], string | undefined>>;

  beforeEach(() => {
    snapshot = {};
    for (const key of envKeys) {
      snapshot[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = snapshot[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("defaults to loopback and port 3100", () => {
    expect(getBuiltinsListenOptions()).toEqual({
      host: "127.0.0.1",
      port: 3100,
    });
  });

  it("reads host and port from env", () => {
    process.env.AGENT_PLAY_BUILTINS_HOST = "0.0.0.0";
    process.env.AGENT_PLAY_BUILTINS_PORT = "3200";
    expect(getBuiltinsListenOptions()).toEqual({
      host: "0.0.0.0",
      port: 3200,
    });
  });
});
