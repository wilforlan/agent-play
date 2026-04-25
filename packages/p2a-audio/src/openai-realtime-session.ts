import WebSocket from "ws";
import {
  p2aAudioDebug,
  p2aAudioTrace,
  truncateBase64Hint,
} from "./p2a-audio-log.js";
import type { P2aRealtimeHandlers, P2aRealtimePort } from "./p2a-realtime-port.js";

export type OpenAiRealtimeSessionOptions = {
  apiKey: string;
  model: string;
  connectWs?: (url: string, headers: Record<string, string>) => WebSocket;
  /** Correlates WebSocket lifecycle logs with a player / bridge instance. */
  logContext?: { playerId?: string };
};

const REALTIME_BETA = "realtime=v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractAudioDelta(msg: Record<string, unknown>): string | null {
  const t = msg.type;
  if (t === "response.output_audio.delta" || t === "response.audio.delta") {
    const d = msg.delta;
    if (typeof d === "string" && d.length > 0) {
      return d;
    }
  }
  return null;
}

function isResponseDone(msg: Record<string, unknown>): boolean {
  const t = msg.type;
  return t === "response.done" || t === "response.completed";
}

export class OpenAiRealtimeSession implements P2aRealtimePort {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly connectWs: (url: string, headers: Record<string, string>) => WebSocket;
  private readonly logContext: { playerId?: string };
  private ws: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private handlers: P2aRealtimeHandlers = {
    onAudioDelta: () => {},
    onResponseDone: () => {},
  };
  private turnResolve: (() => void) | null = null;
  private turnReject: ((e: Error) => void) | null = null;
  private turnTimer: NodeJS.Timeout | null = null;

  constructor(options: OpenAiRealtimeSessionOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.logContext = options.logContext ?? {};
    this.connectWs =
      options.connectWs ??
      ((url, headers) => new WebSocket(url, { headers }));
  }

  setHandlers(handlers: P2aRealtimeHandlers): void {
    this.handlers = handlers;
  }

  private onRawMessage(data: WebSocket.RawData): void {
    const text = typeof data === "string" ? data : data.toString("utf8");
    let msg: unknown;
    try {
      msg = JSON.parse(text) as unknown;
    } catch {
      p2aAudioDebug("realtime:recv_non_json", {
        ...this.logContext,
        rawLen: text.length,
      });
      return;
    }
    if (!isRecord(msg)) {
      return;
    }
    const t = typeof msg.type === "string" ? msg.type : "(no_type)";
    const delta = extractAudioDelta(msg);
    if (delta !== null) {
      p2aAudioTrace("realtime:audio_delta", {
        ...this.logContext,
        type: t,
        deltaB64Len: delta.length,
      });
    } else {
      p2aAudioTrace("realtime:event", {
        ...this.logContext,
        type: t,
      });
    }
    if (delta !== null) {
      this.handlers.onAudioDelta(delta);
    }
    if (isResponseDone(msg)) {
      p2aAudioDebug("realtime:response_done", { ...this.logContext, type: t });
      this.handlers.onResponseDone();
      this.finishTurn();
    }
    const errType = msg.type;
    if (errType === "error") {
      const errObj = msg.error;
      const message =
        isRecord(errObj) && typeof errObj.message === "string"
          ? errObj.message
          : "OpenAI Realtime error";
      p2aAudioDebug("realtime:error_event", {
        ...this.logContext,
        message,
        type: t,
      });
      this.failTurn(new Error(message));
    }
  }

  private finishTurn(): void {
    if (this.turnTimer !== null) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    const r = this.turnResolve;
    this.turnResolve = null;
    this.turnReject = null;
    r?.();
  }

  private failTurn(err: Error): void {
    if (this.turnTimer !== null) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    const r = this.turnReject;
    this.turnResolve = null;
    this.turnReject = null;
    r?.(err);
  }

  private async ensureConnected(): Promise<void> {
    if (this.ws !== null && this.ws.readyState === WebSocket.OPEN) {
      p2aAudioDebug("realtime:reuse_socket", { ...this.logContext, model: this.model });
      return;
    }
    if (this.connectPromise !== null) {
      p2aAudioDebug("realtime:await_connect", this.logContext);
      await this.connectPromise;
      return;
    }
    this.connectPromise = new Promise<void>((resolve, reject) => {
      const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(this.model)}`;
      p2aAudioTrace("realtime:connecting", {
        ...this.logContext,
        model: this.model,
        urlHost: "api.openai.com",
      });
      const socket = this.connectWs(url, {
        Authorization: `Bearer ${this.apiKey}`,
        "OpenAI-Beta": REALTIME_BETA,
      });
      socket.once("error", (err: Error) => {
        p2aAudioDebug("realtime:socket_error", {
          ...this.logContext,
          message: err.message,
        });
        reject(err);
      });
      socket.once("open", () => {
        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            turn_detection: null,
          },
        };
        socket.send(JSON.stringify(sessionUpdate));
        p2aAudioDebug("realtime:open_session_update_sent", {
          ...this.logContext,
          model: this.model,
        });
        this.ws = socket;
        socket.on("message", (d) => {
          this.onRawMessage(d);
        });
        resolve();
      });
    });
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  async appendIntercomAudio(input: {
    encoding: string;
    dataBase64: string;
  }): Promise<void> {
    const inbound = truncateBase64Hint(input.dataBase64);
    p2aAudioDebug("realtime:append_start", {
      ...this.logContext,
      encoding: input.encoding,
      inboundB64Len: inbound.length,
    });
    await this.ensureConnected();
    const ws = this.ws;
    if (ws === null || ws.readyState !== WebSocket.OPEN) {
      p2aAudioDebug("realtime:append_not_open", this.logContext);
      throw new Error("p2a-audio: WebSocket not open");
    }
    await new Promise<void>((resolve, reject) => {
      this.turnResolve = resolve;
      this.turnReject = reject;
      this.turnTimer = setTimeout(() => {
        p2aAudioDebug("realtime:turn_timeout", {
          ...this.logContext,
          ms: 60_000,
        });
        this.failTurn(new Error("p2a-audio: realtime response timeout"));
      }, 60_000);
      ws.send(
        JSON.stringify({
          type: "input_audio_buffer.append",
          audio: input.dataBase64,
        })
      );
      ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      ws.send(JSON.stringify({ type: "response.create" }));
      p2aAudioTrace("realtime:sent_append_commit_create", {
        ...this.logContext,
        inboundB64Len: inbound.length,
      });
    });
    p2aAudioDebug("realtime:append_complete", {
      ...this.logContext,
      inboundB64Len: inbound.length,
    });
  }

  async close(): Promise<void> {
    p2aAudioDebug("realtime:close", this.logContext);
    if (this.turnTimer !== null) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
    this.turnResolve = null;
    this.turnReject = null;
    if (this.ws !== null) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }
}
