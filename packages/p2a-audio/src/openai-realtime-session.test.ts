import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import type WebSocket from "ws";
import { OpenAiRealtimeSession } from "./openai-realtime-session.js";

class ScriptedWs extends EventEmitter {
  static OPEN = 1;
  readyState = ScriptedWs.OPEN;
  sent: string[] = [];
  send(data: string) {
    this.sent.push(data);
    let msg: { type?: string };
    try {
      msg = JSON.parse(data) as { type?: string };
    } catch {
      return;
    }
    if (msg.type === "response.create") {
      queueMicrotask(() => {
        this.emit(
          "message",
          JSON.stringify({ type: "response.output_audio.delta", delta: "QQ==" })
        );
        this.emit("message", JSON.stringify({ type: "response.done" }));
      });
    }
  }
  close() {
    this.emit("close");
  }
}

describe("OpenAiRealtimeSession", () => {
  it("invokes audio deltas then completes when the server sends response.done", async () => {
    let scripted: ScriptedWs | null = null;
    const deltas: string[] = [];
    const done: boolean[] = [];
    const session = new OpenAiRealtimeSession({
      apiKey: "k",
      model: "m",
      connectWs: () => {
        const w = new ScriptedWs();
        scripted = w;
        queueMicrotask(() => {
          w.emit("open");
        });
        return w as unknown as WebSocket;
      },
    });
    session.setHandlers({
      onAudioDelta: (b64) => {
        deltas.push(b64);
      },
      onResponseDone: () => {
        done.push(true);
      },
    });
    await session.appendIntercomAudio({ encoding: "pcm16", dataBase64: "AA==" });
    expect(deltas).toContain("QQ==");
    expect(done).toEqual([true]);
    expect(scripted?.sent.some((s) => s.includes("input_audio_buffer.append"))).toBe(true);
    expect(scripted?.sent.some((s) => s.includes("response.create"))).toBe(true);
    await session.close();
  });
});
