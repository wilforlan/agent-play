import { describe, expect, it } from "vitest";
import {
  MAX_REPLY_DEPTH,
  canReplyToDepth,
  resolveReplyDepth,
  sortThreadedMessages,
} from "./chat-reply-threading.js";

describe("reply threading", () => {
  it("allows exactly two reply layers under a root", () => {
    expect(MAX_REPLY_DEPTH).toBe(2);
    expect(canReplyToDepth(0)).toBe(true);
    expect(canReplyToDepth(1)).toBe(true);
    expect(canReplyToDepth(2)).toBe(false);
    expect(resolveReplyDepth(0)).toBe(1);
    expect(resolveReplyDepth(1)).toBe(2);
    expect(resolveReplyDepth(2)).toBeNull();
  });

  it("orders replies under their parents while preserving sequence within a layer", () => {
    const ordered = sortThreadedMessages([
      { requestId: "root-b", seq: 2, parentRequestId: null, depth: 0 },
      { requestId: "reply-a1", seq: 4, parentRequestId: "root-a", depth: 1 },
      { requestId: "root-a", seq: 1, parentRequestId: null, depth: 0 },
      { requestId: "reply-a1-1", seq: 5, parentRequestId: "reply-a1", depth: 2 },
      { requestId: "reply-b1", seq: 3, parentRequestId: "root-b", depth: 1 },
    ]);
    expect(ordered.map((row) => row.requestId)).toEqual([
      "root-a",
      "reply-a1",
      "reply-a1-1",
      "root-b",
      "reply-b1",
    ]);
  });
});
