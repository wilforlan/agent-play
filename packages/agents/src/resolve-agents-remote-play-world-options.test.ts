import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveAgentsRemotePlayWorldOptions } from "./resolve-agents-remote-play-world-options.js";

describe("resolveAgentsRemotePlayWorldOptions", () => {
  let prev: string | undefined;

  beforeEach(() => {
    prev = process.env.AGENT_PLAY_WEB_UI_URL;
    delete process.env.AGENT_PLAY_WEB_UI_URL;
  });

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.AGENT_PLAY_WEB_UI_URL;
    } else {
      process.env.AGENT_PLAY_WEB_UI_URL = prev;
    }
  });

  it("returns empty object when AGENT_PLAY_WEB_UI_URL is unset", () => {
    expect(resolveAgentsRemotePlayWorldOptions()).toEqual({});
  });

  it("returns baseUrl when AGENT_PLAY_WEB_UI_URL is set", () => {
    process.env.AGENT_PLAY_WEB_UI_URL = "http://web-ui:8888/";
    expect(resolveAgentsRemotePlayWorldOptions()).toEqual({
      baseUrl: "http://web-ui:8888",
    });
  });
});
