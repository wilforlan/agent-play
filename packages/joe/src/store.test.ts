import { describe, expect, it } from "vitest";
import { createInMemoryJoeChatStore } from "./store.js";

describe("createInMemoryJoeChatStore", () => {
  it("appends student and joe messages in order", async () => {
    const store = createInMemoryJoeChatStore();
    const key = {
      facultyId: "faculty-art",
      pathId: "art-visual-studio",
      lessonId: "art-visual-studio/01-seeing-drawing",
    };
    await store.appendMessage({
      ...key,
      message: {
        id: "s1",
        role: "student",
        text: "Hello Joe",
        createdAt: "2026-10-03T12:00:00.000Z",
      },
    });
    await store.appendMessage({
      ...key,
      message: {
        id: "j1",
        role: "joe",
        text: "Begin with contour.",
        createdAt: "2026-10-03T12:00:01.000Z",
      },
    });
    const thread = await store.getThread(key);
    expect(thread.messages.map((m) => m.role)).toEqual(["student", "joe"]);
    expect(thread.messages[0]?.text).toBe("Hello Joe");
  });
});
