import { describe, expect, it } from "vitest";
import {
  normalizeIntercomResult,
  parseCreateHumanNodePayload,
  parseIntercomCommandPayload,
  parseIntercomResponsePayload,
  parseWorldChatPublishPayload,
  parseWorldIntercomEventPayload,
} from "./validator.js";

describe("intercom contracts", () => {
  it("accepts valid intercomCommand payload", () => {
    const payload = parseIntercomCommandPayload({
      requestId: "req-1",
      mainNodeId: "main-1",
      fromPlayerId: "__human__",
      toPlayerId: "agent-1",
      kind: "chat",
      text: "hello",
      intercomAddress: "ap-intercom://main-1",
    });
    expect(payload.kind).toBe("chat");
    expect(payload.toPlayerId).toBe("agent-1");
    expect(payload.intercomAddress).toBe("ap-intercom://main-1");
  });

  it("rejects command payload when identifiers are empty", () => {
    expect(() =>
      parseIntercomCommandPayload({
        requestId: "",
        mainNodeId: "",
        fromPlayerId: "__human__",
        toPlayerId: "agent-1",
        kind: "assist",
        toolName: "assist_build_budget",
        args: {},
      })
    ).toThrow();
  });

  it("accepts world intercom completed event payload", () => {
    const payload = parseWorldIntercomEventPayload({
      requestId: "req-2",
      mainNodeId: "main-1",
      toPlayerId: "__human__",
      fromPlayerId: "agent-1",
      kind: "assist",
      status: "completed",
      ts: new Date().toISOString(),
      toolName: "assist_build_budget",
      result: { ok: true },
      intercomAddress: "ap-intercom://main-1",
    });
    expect(payload.status).toBe("completed");
    expect(payload.intercomAddress).toBe("ap-intercom://main-1");
  });

  it("accepts realtime command payload", () => {
    const payload = parseIntercomCommandPayload({
      requestId: "req-rt-1",
      mainNodeId: "main-1",
      fromPlayerId: "__human__",
      toPlayerId: "agent-1",
      kind: "realtime",
    });
    expect(payload.kind).toBe("realtime");
  });

  it("accepts forwarded event with command echo", () => {
    const cmd = {
      requestId: "req-f",
      mainNodeId: "main-1",
      fromPlayerId: "__human__",
      toPlayerId: "p1",
      kind: "assist" as const,
      toolName: "assist_build_budget",
      args: {},
    };
    const payload = parseWorldIntercomEventPayload({
      requestId: "req-f",
      mainNodeId: "main-1",
      toPlayerId: "__human__",
      fromPlayerId: "p1",
      kind: "assist",
      status: "forwarded",
      ts: new Date().toISOString(),
      channelKey: "intercom:human:m:agent:a1",
      command: cmd,
    });
    expect(payload.status).toBe("forwarded");
    expect(payload.command?.requestId).toBe("req-f");
  });

  it("rejects event payload with invalid status", () => {
    expect(() =>
      parseWorldIntercomEventPayload({
        requestId: "req-3",
        mainNodeId: "main-1",
        toPlayerId: "__human__",
        fromPlayerId: "agent-1",
        kind: "assist",
        status: "done",
        ts: new Date().toISOString(),
      })
    ).toThrow();
  });

  it("parses intercomResponse payload", () => {
    const p = parseIntercomResponsePayload({
      requestId: "r1",
      mainNodeId: "m1",
      toPlayerId: "__human__",
      fromPlayerId: "agent-1",
      kind: "chat",
      status: "completed",
      ts: new Date().toISOString(),
      result: { message: "hi" },
    });
    expect(p.status).toBe("completed");
  });

  it("parses createHumanNode when consent is true and nodeId + passwHash are supplied", () => {
    const p = parseCreateHumanNodePayload({
      consent: true,
      nodeId: "node-id-123",
      passwHash: "0123456789abcdef".repeat(4),
    });
    expect(p.consent).toBe(true);
    expect(p.nodeId).toBe("node-id-123");
    expect(p.passwHash).toBe("0123456789abcdef".repeat(4));
  });

  it("rejects createHumanNode without consent", () => {
    expect(() =>
      parseCreateHumanNodePayload({
        consent: false,
        nodeId: "node-id-123",
        passwHash: "abcdef",
      })
    ).toThrow();
  });

  it("rejects createHumanNode without passwHash", () => {
    expect(() =>
      parseCreateHumanNodePayload({
        consent: true,
        nodeId: "node-id-123",
      })
    ).toThrow();
  });

  it("rejects createHumanNode without nodeId", () => {
    expect(() =>
      parseCreateHumanNodePayload({
        consent: true,
        passwHash: "abcdef",
      })
    ).toThrow();
  });

  it("accepts world chat publish payload", () => {
    const payload = parseWorldChatPublishPayload({
      requestId: "room-1",
      mainNodeId: "main-1",
      fromPlayerId: "__human__",
      message: "hello world",
    });
    expect(payload.message).toBe("hello world");
  });

  it("rejects world chat publish payload with empty message", () => {
    expect(() =>
      parseWorldChatPublishPayload({
        requestId: "room-2",
        mainNodeId: "main-1",
        fromPlayerId: "__human__",
        message: "   ",
      })
    ).toThrow();
  });

  it("normalizes intercom text result with messageKind=text", () => {
    const normalized = normalizeIntercomResult({
      message: "hello",
    });
    expect(normalized.messageKind).toBe("text");
    expect(normalized.message).toBe("hello");
  });

  it("preserves media payload and marks messageKind=media", () => {
    const normalized = normalizeIntercomResult({
      result: {
        media: {
          mediaType: "image",
          url: "https://example.com/image.png",
        },
      },
    });
    expect(normalized.messageKind).toBe("media");
    expect(normalized.media).toBeDefined();
  });
});
