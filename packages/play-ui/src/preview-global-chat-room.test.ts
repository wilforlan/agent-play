// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPreviewGlobalChatRoom,
  formatCompactCount,
} from "./preview-global-chat-room.js";

describe("createPreviewGlobalChatRoom", () => {
  let p2aEnabled = false;
  let intercomAddress: string | null = null;

  const createRoom = () =>
    createPreviewGlobalChatRoom({
      apiBase: "http://localhost/api/agent-play",
      getSid: () => "sid-1",
      getMainNodeId: () => "main-1",
      resolveSenderName: (id) => (id === "main-1" ? "You" : id),
      getP2aEnabled: () => p2aEnabled,
      setP2aEnabled: (next) => {
        p2aEnabled = next;
      },
      getIntercomAddress: () => intercomAddress,
      ensureIntercomAddress: () => {
        if (intercomAddress === null) {
          intercomAddress = "intercom-address://intercom:world:global";
        }
        return intercomAddress;
      },
    });

  beforeEach(() => {
    p2aEnabled = false;
    intercomAddress = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        const body =
          typeof init?.body === "string"
            ? (JSON.parse(init.body) as { op?: string; payload?: { limit?: number } })
            : {};
        if (body.op === "worldChatHistory") {
          return {
            ok: true,
            json: async () => ({
              messages: [],
              hasMore: false,
              totalCount: 0,
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ ok: true }),
        };
      })
    );
    vi.stubGlobal("crypto", {
      randomUUID: () => "req-local-1",
    });
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn(async () => {}),
      },
      share: vi.fn(async () => {}),
    });
  });

  it("sends worldChatPublish RPC and appends local message", async () => {
    const room = createRoom();
    const input = room.element.querySelector(
      ".preview-global-chat-room__input"
    ) as HTMLInputElement | null;
    const send = room.element.querySelector(
      ".preview-global-chat-room__send"
    ) as HTMLButtonElement | null;
    expect(input).not.toBeNull();
    expect(send).not.toBeNull();

    input!.value = "hello room";
    send!.click();
    await Promise.resolve();
    await Promise.resolve();

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const init = fetchMock.mock.calls[1]?.[1] as RequestInit | undefined;
    expect(typeof init?.body).toBe("string");
    const payload = JSON.parse(init?.body as string) as {
      op: string;
      payload: { message: string };
    };
    expect(payload.op).toBe("worldChatPublish");
    expect(payload.payload.message).toBe("hello room");
    expect(room.getLines().map((line) => line.message)).toContain("hello room");
  });

  it("keeps all appended lines until large cap", () => {
    const room = createRoom();
    for (let i = 0; i < 205; i += 1) {
      room.appendFromIntercomEvent({
        requestId: `r-${i}`,
        fromPlayerId: `p-${i}`,
        message: `m-${i}`,
        ts: new Date().toISOString(),
      });
    }
    expect(room.getLines().length).toBe(205);
    expect(room.getLines()[0]?.message).toBe("m-0");
    expect(room.getLines()[204]?.message).toBe("m-204");
  });

  it("formats compact counts", () => {
    expect(formatCompactCount(999)).toBe("999");
    expect(formatCompactCount(1200)).toBe("1.2K");
    expect(formatCompactCount(12_400)).toBe("12K");
    expect(formatCompactCount(2_450_000)).toBe("2.5M");
  });

  it("loads initial 100 history rows and displays compact total count", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        const body =
          typeof init?.body === "string"
            ? (JSON.parse(init.body) as { op?: string })
            : {};
        if (body.op === "worldChatHistory") {
          return {
            ok: true,
            json: async () => ({
              messages: Array.from({ length: 100 }, (_, i) => ({
                seq: 200 - i,
                requestId: `h-${200 - i}`,
                fromPlayerId: "main-2",
                message: `m-${200 - i}`,
                ts: "2026-04-13T09:00:00.000Z",
              })),
              hasMore: true,
              totalCount: 1234,
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({ ok: true }),
        };
      })
    );
    const room = createRoom();
    await Promise.resolve();
    await Promise.resolve();
    expect(room.getLines().length).toBe(100);
    const count = room.element.querySelector(
      ".preview-global-chat-room__count"
    ) as HTMLElement | null;
    expect(count?.textContent).toBe("1.2K");
  });

  it("shows P2A controls and intercom address when enabled", async () => {
    const room = createRoom();
    const toggle = room.element.querySelector(
      ".preview-global-chat-room__p2a-toggle"
    ) as HTMLInputElement | null;
    const addressPanel = room.element.querySelector(
      ".preview-global-chat-room__p2a-panel"
    ) as HTMLDivElement | null;
    expect(toggle).not.toBeNull();
    expect(toggle?.checked).toBe(false);
    expect(addressPanel?.hidden).toBe(true);
    if (toggle !== null) {
      toggle.checked = true;
      toggle.dispatchEvent(new Event("change"));
    }
    expect(p2aEnabled).toBe(true);
    expect(intercomAddress).toBe("intercom-address://intercom:world:global");
    expect(addressPanel?.hidden).toBe(false);
    const addressInput = room.element.querySelector(
      ".preview-global-chat-room__address-input"
    ) as HTMLInputElement | null;
    expect(addressInput?.value).toBe(intercomAddress);
    const copyButton = room.element.querySelector(
      ".preview-global-chat-room__address-copy"
    ) as HTMLButtonElement | null;
    copyButton?.click();
    await Promise.resolve();
    const nav = navigator as unknown as {
      clipboard: { writeText: ReturnType<typeof vi.fn> };
    };
    expect(nav.clipboard.writeText).toHaveBeenCalledWith(intercomAddress);
  });
});
