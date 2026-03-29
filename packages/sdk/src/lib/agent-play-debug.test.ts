import { afterEach, describe, expect, it, vi } from "vitest";
import {
  agentPlayDebug,
  configureAgentPlayDebug,
  isAgentPlayDebugEnabled,
  resetAgentPlayDebug,
} from "./agent-play-debug.js";

describe("agent-play-debug", () => {
  afterEach(() => {
    resetAgentPlayDebug();
    vi.unstubAllEnvs();
  });

  it("is disabled by default when env is unset", () => {
    vi.stubEnv("AGENT_PLAY_DEBUG", undefined);
    expect(isAgentPlayDebugEnabled()).toBe(false);
  });

  it("is enabled when AGENT_PLAY_DEBUG is 1", () => {
    vi.stubEnv("AGENT_PLAY_DEBUG", "1");
    expect(isAgentPlayDebugEnabled()).toBe(true);
  });

  it("configureAgentPlayDebug false wins over env", () => {
    vi.stubEnv("AGENT_PLAY_DEBUG", "1");
    configureAgentPlayDebug({ debug: false });
    expect(isAgentPlayDebugEnabled()).toBe(false);
  });

  it("configureAgentPlayDebug true enables without env", () => {
    vi.stubEnv("AGENT_PLAY_DEBUG", undefined);
    configureAgentPlayDebug({ debug: true });
    expect(isAgentPlayDebugEnabled()).toBe(true);
  });

  it("agentPlayDebug calls console.debug when enabled", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    configureAgentPlayDebug({ debug: true });
    agentPlayDebug("test", "hello", { n: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]?.[0])).toContain("[agent-play:test]");
    expect(String(spy.mock.calls[0]?.[0])).toContain("hello");
    spy.mockRestore();
  });

  it("agentPlayDebug does not call console.debug when disabled", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});
    configureAgentPlayDebug({ debug: false });
    vi.stubEnv("AGENT_PLAY_DEBUG", "1");
    expect(isAgentPlayDebugEnabled()).toBe(false);
    agentPlayDebug("test", "silent");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
