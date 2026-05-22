import { describe, expect, it } from "vitest";
import {
  normalizeAgentPlayServerBaseUrl,
  parseBootstrapEnvironmentChoice,
  parseBootstrapNodeArgs,
} from "./bootstrap-node-args.js";

describe("normalizeAgentPlayServerBaseUrl", () => {
  it("accepts http and https and strips a trailing slash", () => {
    expect(normalizeAgentPlayServerBaseUrl("https://example.com/")).toBe(
      "https://example.com"
    );
    expect(normalizeAgentPlayServerBaseUrl("http://127.0.0.1:3000")).toBe(
      "http://127.0.0.1:3000"
    );
  });

  it("rejects non-http(s) and malformed input", () => {
    expect(normalizeAgentPlayServerBaseUrl("ftp://x.com")).toBeNull();
    expect(normalizeAgentPlayServerBaseUrl("not-a-url")).toBeNull();
    expect(normalizeAgentPlayServerBaseUrl("   ")).toBeNull();
  });
});

describe("parseBootstrapNodeArgs", () => {
  it("parses --root-file and --server-url", () => {
    expect(
      parseBootstrapNodeArgs([
        "--server-url",
        "https://third-party.example/",
        "--root-file",
        "/tmp/.root",
      ])
    ).toEqual({
      serverUrl: "https://third-party.example",
      rootFilePath: "/tmp/.root",
    });
  });

  it("throws on invalid --server-url", () => {
    expect(() =>
      parseBootstrapNodeArgs(["--server-url", "not-a-url"])
    ).toThrow(/Invalid --server-url/);
  });
});

describe("parseBootstrapEnvironmentChoice", () => {
  it("accepts pasted absolute URLs", () => {
    expect(parseBootstrapEnvironmentChoice(" https://custom.dev:8443/play/ ")).toEqual({
      kind: "url",
      url: "https://custom.dev:8443/play",
    });
  });

  it("accepts presets and custom sentinel", () => {
    expect(parseBootstrapEnvironmentChoice("1")).toEqual({
      kind: "preset",
      url: "http://127.0.0.1:3000",
    });
    expect(parseBootstrapEnvironmentChoice("LOCAL-SERVER")).toEqual({
      kind: "preset",
      url: "http://127.0.0.1:3000",
    });
    expect(parseBootstrapEnvironmentChoice("custom")).toEqual({ kind: "custom" });
    expect(parseBootstrapEnvironmentChoice("4")).toEqual({ kind: "custom" });
  });
});
