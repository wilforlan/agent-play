import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mintOpenAiRealtimeClientSecret,
  type MintOpenAiRealtimeClientSecretOptions,
} from "./openai-realtime-client-secret.js";

describe("mintOpenAiRealtimeClientSecret", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns mapped client secret payload on success", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          value: "cs_abc123",
          expires_at: "2026-05-01T10:00:00.000Z",
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const out = await mintOpenAiRealtimeClientSecret({
      apiKey: "sk-test",
      model: "gpt-realtime",
      voice: "marin",
    });
    expect(out).toEqual({
      clientSecret: "cs_abc123",
      expiresAt: "2026-05-01T10:00:00.000Z",
      model: "gpt-realtime",
      voice: "marin",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws when key is blank", async () => {
    const options: MintOpenAiRealtimeClientSecretOptions = {
      apiKey: "",
      model: "gpt-realtime",
    };
    await expect(mintOpenAiRealtimeClientSecret(options)).rejects.toThrow(
      /OPENAI_API_KEY/i
    );
  });

  it("throws on non-2xx response", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response("bad", { status: 401 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      mintOpenAiRealtimeClientSecret({
        apiKey: "sk-test",
        model: "gpt-realtime",
      })
    ).rejects.toThrow(/client secret/i);
  });

  it("includes explicit instructions when provided", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ value: "cs_instr" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await mintOpenAiRealtimeClientSecret({
      apiKey: "sk-test",
      instructions: "You are a concise aviation copilot.",
    });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const bodyRaw = init.body;
    const body = typeof bodyRaw === "string" ? JSON.parse(bodyRaw) : null;
    expect(body?.session?.instructions).toBe(
      "You are a concise aviation copilot."
    );
  });
});
