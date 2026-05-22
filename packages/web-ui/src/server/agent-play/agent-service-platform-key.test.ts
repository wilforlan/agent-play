import { describe, expect, it, afterEach, vi } from "vitest";
import {
  AGENT_SERVICE_PLATFORM_KEY_HEADER,
  getConfiguredAgentServiceKey,
  verifyAgentServicePlatformKey,
} from "./agent-service-platform-key.js";

describe("agent-service-platform-key", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("getConfiguredAgentServiceKey returns null when unset", () => {
    vi.stubEnv("AGENT_SERVICE_KEY", "");
    expect(getConfiguredAgentServiceKey()).toBeNull();
  });

  it("verifyAgentServicePlatformKey allows any request when key is unset", () => {
    vi.stubEnv("AGENT_SERVICE_KEY", "");
    const req = new Request("http://localhost/", { headers: {} });
    expect(verifyAgentServicePlatformKey(req)).toBeNull();
  });

  it("verifyAgentServicePlatformKey rejects missing header when key is set", () => {
    vi.stubEnv("AGENT_SERVICE_KEY", "test-service-key-16");
    const req = new Request("http://localhost/", { headers: {} });
    const res = verifyAgentServicePlatformKey(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it("verifyAgentServicePlatformKey rejects wrong key", () => {
    vi.stubEnv("AGENT_SERVICE_KEY", "test-service-key-16");
    const req = new Request("http://localhost/", {
      headers: { [AGENT_SERVICE_PLATFORM_KEY_HEADER]: "wrong-key________" },
    });
    const res = verifyAgentServicePlatformKey(req);
    expect(res?.status).toBe(403);
  });

  it("verifyAgentServicePlatformKey accepts matching key", () => {
    vi.stubEnv("AGENT_SERVICE_KEY", "test-service-key-16");
    const req = new Request("http://localhost/", {
      headers: { [AGENT_SERVICE_PLATFORM_KEY_HEADER]: "test-service-key-16" },
    });
    expect(verifyAgentServicePlatformKey(req)).toBeNull();
  });
});
