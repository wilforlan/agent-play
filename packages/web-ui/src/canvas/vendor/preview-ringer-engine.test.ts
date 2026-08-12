import { describe, expect, it, vi } from "vitest";
import { createPreviewRingerEngine } from "./preview-ringer-engine.js";

describe("createPreviewRingerEngine", () => {
  it("plays direct message when page is present", async () => {
    const playText = vi.fn(async () => {});
    const playRingtone = vi.fn(async () => {});
    const ringer = createPreviewRingerEngine({
      getIsPresent: () => true,
      playText,
      playRingtone,
    });
    await ringer.playIncomingMessage({
      targetName: "Agent One",
      message: "Status update",
    });
    expect(playRingtone).not.toHaveBeenCalled();
    expect(playText).toHaveBeenCalledWith("Status update");
  });

  it("plays ringtone then preface when page is not present", async () => {
    const playText = vi.fn(async () => {});
    const playRingtone = vi.fn(async () => {});
    const ringer = createPreviewRingerEngine({
      getIsPresent: () => false,
      playText,
      playRingtone,
    });
    await ringer.playIncomingMessage({
      targetName: "Agent One",
      message: "Status update",
    });
    expect(playRingtone).toHaveBeenCalledWith({ durationMs: 6000 });
    expect(playText).toHaveBeenCalledWith(
      "Hello, you have an incoming message from Agent One. They have the following message: Status update"
    );
  });

  it("loops ringtone until stopIncomingCallRing", async () => {
    const playRingtone = vi.fn(async () => {});
    const ringer = createPreviewRingerEngine({
      getIsPresent: () => true,
      playRingtone,
    });
    const loop = ringer.startIncomingCallRing();
    await Promise.resolve();
    expect(playRingtone).toHaveBeenCalled();
    ringer.stopIncomingCallRing();
    const callsAfterStop = playRingtone.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(playRingtone.mock.calls.length).toBe(callsAfterStop);
    await loop;
  });
});
