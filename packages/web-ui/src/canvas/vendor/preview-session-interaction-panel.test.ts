// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatCredentialCreatedAt } from "./preview-human-credentials.js";
import { createPreviewSessionInteractionPanel } from "./preview-session-interaction-panel.js";

const CREDENTIALS_KEY = "agent-play.humanCredentials";
const realtimeAgentConstructorMock = vi.fn();
const realtimeSessionConnectMock = vi.fn(async () => {});
const realtimeSessionCloseMock = vi.fn();
const realtimeSessionConstructorMock = vi.fn((_agent, _options) => ({
  connect: realtimeSessionConnectMock,
  close: realtimeSessionCloseMock,
}));

vi.mock("@openai/agents/realtime", () => ({
  RealtimeAgent: function RealtimeAgent(
    options: Record<string, unknown>
  ): Record<string, unknown> {
    realtimeAgentConstructorMock(options);
    return { options };
  },
  RealtimeSession: function RealtimeSession(
    agent: Record<string, unknown>,
    options: Record<string, unknown>
  ): Record<string, unknown> {
    realtimeSessionConstructorMock(agent, options);
    return {
      connect: realtimeSessionConnectMock,
      close: realtimeSessionCloseMock,
    };
  },
}));

describe("createPreviewSessionInteractionPanel", () => {
  beforeEach(() => {
    vi.useRealTimers();
    realtimeAgentConstructorMock.mockClear();
    realtimeSessionConnectMock.mockClear();
    realtimeSessionCloseMock.mockClear();
    realtimeSessionConstructorMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
    sessionStorage.removeItem(CREDENTIALS_KEY);
  });

  it("posts intercomCommand assist invocation with target player id", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "req-test-uuid",
    });
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    panel.setAgents([
      {
        agentId: "agent-1",
        name: "Agent 1",
        assistTools: [
          {
            name: "assist_plan_day",
            description: "Plan a day",
            parameters: { task: { type: "string" } },
          },
        ],
      },
    ]);
    panel.setContext("agent-1");
    panel.setMode("assist");
    document.body.append(panel.element);
    const toolBtn = panel.element.querySelector(
      ".preview-session-interaction__assist-tool-btn"
    ) as HTMLButtonElement;
    toolBtn.click();
    const input = panel.element.querySelector(
      ".preview-session-interaction__assist-form input[name='task']"
    ) as HTMLInputElement;
    input.value = "draft roadmap";
    const form = panel.element.querySelector(
      ".preview-session-interaction__assist-form"
    ) as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as {
      op?: string;
      payload?: {
        toPlayerId?: string;
        fromPlayerId?: string;
        kind?: string;
        toolName?: string;
        args?: Record<string, unknown>;
      };
    };
    expect(body.op).toBe("intercomCommand");
    expect(body.payload?.toPlayerId).toBe("agent-1");
    expect(body.payload?.fromPlayerId).toBe("main-node-1");
    expect(body.payload?.kind).toBe("assist");
    expect(body.payload?.toolName).toBe("assist_plan_day");
    expect(body.payload?.args).toEqual({ task: "draft roadmap" });
  });

  it("coerces assist args to numbers when fieldType is number", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "req-num-uuid",
    });
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    panel.setAgents([
      {
        agentId: "agent-1",
        name: "Agent 1",
        assistTools: [
          {
            name: "assist_metrics",
            description: "Metrics",
            parameters: { amount: { fieldType: "number" as const, field: "amount" } },
          },
        ],
      },
    ]);
    panel.setContext("agent-1");
    panel.setMode("assist");
    document.body.append(panel.element);
    const toolBtn = panel.element.querySelector(
      ".preview-session-interaction__assist-tool-btn"
    ) as HTMLButtonElement;
    toolBtn.click();
    const input = panel.element.querySelector(
      ".preview-session-interaction__assist-form input[name='amount']"
    ) as HTMLInputElement;
    expect(input.type).toBe("number");
    input.value = "42.5";
    const form = panel.element.querySelector(
      ".preview-session-interaction__assist-form"
    ) as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as {
      payload?: { args?: Record<string, unknown> };
    };
    expect(body.payload?.args).toEqual({ amount: 42.5 });
  });

  it("replaces assist form with loading after submit while awaiting intercom", async () => {
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>(() => {
          /* never resolves */
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "req-assist-wait",
    });
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    panel.setAgents([
      {
        agentId: "agent-1",
        name: "Agent 1",
        assistTools: [
          {
            name: "assist_plan_day",
            description: "Plan a day",
            parameters: { task: { type: "string" } },
          },
        ],
      },
    ]);
    panel.setContext("agent-1");
    panel.setMode("assist");
    document.body.append(panel.element);
    const toolBtn = panel.element.querySelector(
      ".preview-session-interaction__assist-tool-btn"
    ) as HTMLButtonElement;
    toolBtn.click();
    const input = panel.element.querySelector(
      ".preview-session-interaction__assist-form input[name='task']"
    ) as HTMLInputElement;
    input.value = "draft roadmap";
    const form = panel.element.querySelector(
      ".preview-session-interaction__assist-form"
    ) as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalled();
    expect(
      panel.element.querySelector(".preview-session-interaction__assist-form")
    ).toBeNull();
    expect(
      panel.element.querySelector(".preview-session-interaction__reply-loading")
    ).not.toBeNull();
  });

  it("shows timeout error and restores chat compose when no matching intercom event within 30s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }))
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => "req-chat-timeout",
    });
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    panel.setAgents([{ agentId: "agent-1", name: "Agent 1" }]);
    panel.setContext("agent-1");
    panel.setMode("chat");
    document.body.append(panel.element);
    const input = panel.element.querySelector(
      ".preview-session-interaction__chat-input"
    ) as HTMLInputElement;
    input.value = "hello";
    const form = panel.element.querySelector(
      ".preview-session-interaction__chat-compose"
    ) as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(
      panel.element.querySelector(".preview-session-interaction__chat-compose")
    ).not.toBeNull();
    expect(panel.element.textContent).toMatch(/Sorry, failed: timeout/i);
    const errPanel = panel.element.querySelector(
      ".preview-session-interaction__error-panel"
    ) as HTMLElement;
    expect(errPanel.hidden).toBe(false);
  });

  it("restores chat compose after completed intercom event for pending request", async () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "req-chat-done",
    });
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }))
    );
    vi.stubGlobal("fetch", fetchMock);
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    panel.setAgents([{ agentId: "agent-1", name: "Agent 1" }]);
    panel.setContext("agent-1");
    panel.setMode("chat");
    document.body.append(panel.element);
    const input = panel.element.querySelector(
      ".preview-session-interaction__chat-input"
    ) as HTMLInputElement;
    input.value = "hello";
    const form = panel.element.querySelector(
      ".preview-session-interaction__chat-compose"
    ) as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await Promise.resolve();
    expect(
      panel.element.querySelector(".preview-session-interaction__reply-loading")
    ).not.toBeNull();
    panel.applyIntercomEvent({
      requestId: "req-chat-done",
      mainNodeId: "main-node-1",
      toPlayerId: "main-node-1",
      fromPlayerId: "agent-1",
      kind: "chat",
      status: "completed",
      message: "hi back",
      ts: "2026-04-10T12:00:00.000Z",
    });
    expect(
      panel.element.querySelector(".preview-session-interaction__chat-compose")
    ).not.toBeNull();
    expect(
      panel.element.querySelector(".preview-session-interaction__reply-loading")
    ).toBeNull();
  });

  it("shows disabled copy in push-to-talk when agent enableP2a is off", () => {
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    panel.setAgents([
      { agentId: "agent-1", name: "Agent 1", enableP2a: "off" },
    ]);
    panel.setContext("agent-1");
    panel.setMode("push_to_talk");
    document.body.append(panel.element);
    expect(
      panel.element.querySelector(".preview-session-interaction__audio-tools")
    ).toBeNull();
    expect(panel.element.textContent).toMatch(/not enabled for this agent/i);
  });

  it("shows missing-credentials warning when P2A is on but realtime credentials are absent", () => {
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    panel.setAgents([
      { agentId: "agent-1", name: "Agent 1", enableP2a: "on" },
    ]);
    panel.setContext("agent-1");
    panel.setMode("push_to_talk");
    document.body.append(panel.element);
    expect(
      panel.element.querySelector(".preview-session-interaction__chat-compose")
    ).toBeNull();
    expect(
      panel.element.querySelector(".preview-session-interaction__audio-tools")
    ).toBeNull();
    expect(panel.element.textContent).toMatch(
      /requests fresh credentials over intercom/i
    );
  });

  it("shows WebRTC voice controls instead of MediaRecorder tools when token is present", () => {
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    panel.setAgents([
      {
        agentId: "agent-1",
        name: "Agent 1",
        enableP2a: "on",
        realtimeWebrtc: {
          clientSecret: "cs_test",
          model: "gpt-realtime",
        },
      },
    ]);
    panel.setContext("agent-1");
    panel.setMode("push_to_talk");
    document.body.append(panel.element);
    expect(panel.element.textContent).toMatch(
      /requests fresh credentials over intercom/i
    );
    expect(
      panel.element.querySelector(".preview-session-interaction__audio-stop-btn")
    ).toBeNull();
    expect(panel.element.textContent).toMatch(/connect voice/i);
  });

  it("preparePushToTalkConnection uses Realtime SDK with agent name, instructions, model, and ephemeral key", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop: vi.fn() }],
        })),
      },
    });
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    panel.setAgents([
      {
        agentId: "agent-1",
        name: "Agent One",
        enableP2a: "on",
        realtimeWebrtc: {
          clientSecret: "cs_test_123",
          model: "gpt-realtime",
        },
        realtimeInstructions: "Be concise and helpful.",
      },
    ]);
    const ok = await panel.preparePushToTalkConnection("agent-1");
    expect(ok).toBe(true);
    expect(realtimeAgentConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Agent One",
        instructions: "Be concise and helpful.",
      })
    );
    expect(realtimeSessionConstructorMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        model: "gpt-realtime",
      })
    );
    expect(realtimeSessionConnectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "cs_test_123",
      })
    );
  });

  it("preparePushToTalkConnection returns false when target does not have P2A enabled", async () => {
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    panel.setAgents([{ agentId: "agent-1", name: "Agent 1", enableP2a: "off" }]);
    const ok = await panel.preparePushToTalkConnection("agent-1");
    expect(ok).toBe(false);
  });

  it("focuses chat input when focusChatInput is called", () => {
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    panel.setAgents([{ agentId: "agent-1", name: "Agent 1" }]);
    panel.setContext("agent-1");
    panel.setMode("chat");
    document.body.append(panel.element);
    panel.focusChatInput();
    expect(document.activeElement?.className).toContain(
      "preview-session-interaction__chat-input"
    );
  });


  it("renders media completion from intercom response in chat mode", async () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "req-chat-media",
    });
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }))
    );
    vi.stubGlobal("fetch", fetchMock);
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    panel.setAgents([{ agentId: "agent-1", name: "Agent 1" }]);
    panel.setContext("agent-1");
    panel.setMode("chat");
    document.body.append(panel.element);
    const input = panel.element.querySelector(
      ".preview-session-interaction__chat-input"
    ) as HTMLInputElement;
    input.value = "show media";
    const form = panel.element.querySelector(
      ".preview-session-interaction__chat-compose"
    ) as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await Promise.resolve();
    panel.applyIntercomEvent({
      requestId: "req-chat-media",
      mainNodeId: "main-node-1",
      toPlayerId: "main-node-1",
      fromPlayerId: "agent-1",
      kind: "chat",
      status: "completed",
      result: {
        messageKind: "media",
        media: {
          mediaType: "image",
          url: "https://example.com/x.png",
        },
      },
      ts: "2026-04-10T12:00:00.000Z",
    });
    expect(panel.element.textContent).toContain("Media:");
    expect(panel.element.textContent).toContain("https://example.com/x.png");
  });

  it("shows node id and created time from stored human credentials", () => {
    sessionStorage.setItem(
      CREDENTIALS_KEY,
      JSON.stringify({
        nodeId: "node-test-1",
        passw: "secret",
        createdAtIso: "2026-04-10T12:00:00.000Z",
      })
    );
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    document.body.append(panel.element);
    const rows = panel.element.querySelectorAll(
      ".preview-session-interaction__node-info-row"
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const nodeIdText = rows[0]?.textContent ?? "";
    const createdText = rows[1]?.textContent ?? "";
    expect(nodeIdText).toContain("node-test-1");
    expect(createdText).toContain(
      formatCredentialCreatedAt("2026-04-10T12:00:00.000Z")
    );
  });

  it("calls onHumanNodeLifecycle with setup when no credentials and node action is used", async () => {
    const onHumanNodeLifecycle = vi.fn(async () => {});
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
      onHumanNodeLifecycle,
    });
    document.body.append(panel.element);
    const nodeBtn = panel.element.querySelector(
      "[data-node-ui]"
    ) as HTMLButtonElement;
    nodeBtn.click();
    await Promise.resolve();
    expect(onHumanNodeLifecycle).toHaveBeenCalledWith("setup");
  });

  it("shows error panel when chat submit is blocked by missing sid", () => {
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => null,
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
    });
    panel.setAgents([{ agentId: "agent-1", name: "Agent 1" }]);
    panel.setContext("agent-1");
    panel.setMode("chat");
    document.body.append(panel.element);
    const input = panel.element.querySelector(
      ".preview-session-interaction__chat-input"
    ) as HTMLInputElement;
    input.value = "hello";
    const form = panel.element.querySelector(
      ".preview-session-interaction__chat-compose"
    ) as HTMLFormElement;
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    const errPanel = panel.element.querySelector(
      ".preview-session-interaction__error-panel"
    ) as HTMLElement;
    expect(errPanel.hidden).toBe(false);
    expect(errPanel.textContent).toMatch(/session id/i);
    const pre = panel.element.querySelector(
      ".preview-session-interaction__error-pre"
    );
    expect(pre?.textContent).toContain("sid_null");
  });

  it("calls onHumanNodeLifecycle with replace after danger confirmation", async () => {
    sessionStorage.setItem(
      CREDENTIALS_KEY,
      JSON.stringify({
        nodeId: "node-test-1",
        passw: "secret",
        createdAtIso: "2026-04-10T12:00:00.000Z",
      })
    );
    const onHumanNodeLifecycle = vi.fn(async () => {});
    const panel = createPreviewSessionInteractionPanel({
      getSid: () => "sid-1",
      apiBase: "/api/agent-play",
      getMainNodeId: () => "main-node-1",
      onHumanNodeLifecycle,
    });
    document.body.append(panel.element);
    const nodeBtn = panel.element.querySelector(
      "[data-node-ui]"
    ) as HTMLButtonElement;
    nodeBtn.click();
    await Promise.resolve();
    const confirmBtn = document.querySelector(
      ".preview-session-interaction__danger-confirm"
    ) as HTMLButtonElement | null;
    expect(confirmBtn).not.toBeNull();
    confirmBtn?.click();
    await Promise.resolve();
    expect(onHumanNodeLifecycle).toHaveBeenCalledWith("replace");
  });
});
