// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPreviewGlobalChatRoom,
  formatCompactCount,
} from "./preview-global-chat-room.js";

describe("createPreviewGlobalChatRoom", () => {
  beforeEach(() => {
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
  });

  it("sends worldChatPublish RPC and appends local message", async () => {
    const room = createPreviewGlobalChatRoom({
      apiBase: "http://localhost/api/agent-play",
      getSid: () => "sid-1",
      getMainNodeId: () => "main-1",
      resolveSenderName: () => "You",
    });
    const input = room.element.querySelector(
      ".preview-global-chat-room__input"
    ) as HTMLInputElement | null;
    const send = room.element.querySelector(
      ".preview-global-chat-room__send"
    ) as HTMLButtonElement | null;
    expect(input).not.toBeNull();
    expect(send).not.toBeNull();

    input!.value = "hello room 😀";
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
    expect(payload.payload.message).toBe("hello room 😀");
    expect(room.getLines().map((line) => line.message)).toContain("hello room 😀");
  });

  it(
    "keeps all appended lines until large cap",
    () => {
      const room = createPreviewGlobalChatRoom({
        apiBase: "http://localhost/api/agent-play",
        getSid: () => "sid-1",
        getMainNodeId: () => "main-1",
        resolveSenderName: (id) => id,
      });
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
    },
    15000
  );

  it("formats compact counts", () => {
    expect(formatCompactCount(999)).toBe("999");
    expect(formatCompactCount(1200)).toBe("1.2K");
    expect(formatCompactCount(12_400)).toBe("12K");
    expect(formatCompactCount(2_450_000)).toBe("2.5M");
  });
});
