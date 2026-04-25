import { Buffer } from "node:buffer";
import type { AgentAudioEvent, RegisteredPlayer } from "@agent-play/sdk";
import type { RemotePlayWorld } from "@agent-play/sdk";
import type { IntercomResponsePayload } from "@agent-play/intercom";
import { OpenAiRealtimeSession } from "./openai-realtime-session.js";
import { p2aAudioDebug, p2aAudioTrace } from "./p2a-audio-log.js";
import type { P2aRealtimePort } from "./p2a-realtime-port.js";

export type AttachP2aAudioBridgeOptions = {
  world: RemotePlayWorld;
  registered: RegisteredPlayer;
  openaiApiKey: string;
  model?: string;
  realtimeFactory?: () => P2aRealtimePort;
};

export type P2aAudioBridge = {
  handleAgentAudioEvent: (event: AgentAudioEvent) => Promise<void>;
  dispose: () => Promise<void>;
};

export function attachP2aAudioBridge(options: AttachP2aAudioBridgeOptions): P2aAudioBridge {
  const {
    world,
    registered,
    openaiApiKey,
    model,
    realtimeFactory = () =>
      new OpenAiRealtimeSession({
        apiKey: openaiApiKey,
        model: model ?? "gpt-realtime",
        logContext: { playerId: registered.id },
      }),
  } = options;

  const playerId = registered.id;
  let realtime: P2aRealtimePort | null = null;
  let inflight = false;

  const getRealtime = (): P2aRealtimePort => {
    if (realtime === null) {
      realtime = realtimeFactory();
    }
    return realtime;
  };

  const handleAgentAudioEvent = async (event: AgentAudioEvent): Promise<void> => {
    if (event.toPlayerId !== playerId) {
      p2aAudioDebug("bridge:skip_wrong_player", {
        playerId,
        toPlayerId: event.toPlayerId,
        requestId: event.requestId,
      });
      return;
    }
    if (inflight) {
      p2aAudioDebug("bridge:skip_inflight", {
        playerId,
        requestId: event.requestId,
      });
      return;
    }
    const inboundB64Len = event.audio.dataBase64.length;
    p2aAudioTrace("bridge:audio_inbound", {
      playerId,
      requestId: event.requestId,
      mainNodeId: event.mainNodeId,
      fromPlayerId: event.fromPlayerId,
      toPlayerId: event.toPlayerId,
      encoding: event.audio.encoding,
      inboundB64Len,
    });
    p2aAudioDebug("bridge:handle_start", {
      playerId,
      requestId: event.requestId,
      encoding: event.audio.encoding,
      inboundB64Len,
    });
    inflight = true;
    const rt = getRealtime();
    const mergedChunks: Buffer[] = [];
    let streamSeq = 0;
    rt.setHandlers({
      onAudioDelta: (base64Pcm: string) => {
        mergedChunks.push(Buffer.from(base64Pcm, "base64"));
        streamSeq += 1;
        p2aAudioTrace("bridge:intercom_stream", {
          playerId,
          requestId: event.requestId,
          seq: streamSeq,
          deltaB64Len: base64Pcm.length,
        });
        const payload: IntercomResponsePayload = {
          requestId: event.requestId,
          mainNodeId: event.mainNodeId,
          toPlayerId: event.fromPlayerId,
          fromPlayerId: event.toPlayerId,
          kind: "audio",
          status: "stream",
          ts: new Date().toISOString(),
          result: {
            messageKind: "audio",
            message: "",
            audio: {
              encoding: "pcm16",
              dataBase64: base64Pcm,
            },
          },
        };
        void world.sendIntercomResponse(payload).then(
          () => {
            p2aAudioDebug("bridge:intercom_stream_ok", {
              playerId,
              requestId: event.requestId,
              seq: streamSeq,
            });
          },
          (err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            p2aAudioDebug("bridge:intercom_stream_err", {
              playerId,
              requestId: event.requestId,
              seq: streamSeq,
              message,
            });
          }
        );
      },
      onResponseDone: () => {
        const merged =
          mergedChunks.length > 0
            ? Buffer.concat(mergedChunks).toString("base64")
            : "";
        mergedChunks.length = 0;
        p2aAudioTrace("bridge:intercom_completed_prepare", {
          playerId,
          requestId: event.requestId,
          mergedB64Len: merged.length,
          streamChunks: streamSeq,
        });
        const payload: IntercomResponsePayload = {
          requestId: event.requestId,
          mainNodeId: event.mainNodeId,
          toPlayerId: event.fromPlayerId,
          fromPlayerId: event.toPlayerId,
          kind: "audio",
          status: "completed",
          ts: new Date().toISOString(),
          result: {
            messageKind: "audio",
            message: "",
            audio: {
              encoding: "pcm16",
              dataBase64: merged,
            },
          },
        };
        void world.sendIntercomResponse(payload).then(
          () => {
            p2aAudioDebug("bridge:intercom_completed_ok", {
              playerId,
              requestId: event.requestId,
              mergedB64Len: merged.length,
            });
          },
          (err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            p2aAudioDebug("bridge:intercom_completed_err", {
              playerId,
              requestId: event.requestId,
              message,
            });
          }
        );
      },
    });
    try {
      await rt.appendIntercomAudio(event.audio);
      p2aAudioDebug("bridge:realtime_turn_ok", {
        playerId,
        requestId: event.requestId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      p2aAudioDebug("bridge:realtime_turn_err", {
        playerId,
        requestId: event.requestId,
        message,
      });
      throw err;
    } finally {
      inflight = false;
    }
  };

  const dispose = async (): Promise<void> => {
    p2aAudioDebug("bridge:dispose", { playerId });
    if (realtime !== null) {
      await realtime.close();
      realtime = null;
    }
  };

  return { handleAgentAudioEvent, dispose };
}

export function subscribeP2aAudioBridge(options: AttachP2aAudioBridgeOptions): {
  dispose: () => Promise<void>;
} {
  const bridge = attachP2aAudioBridge(options);
  const pid = options.registered.id;
  p2aAudioDebug("bridge:subscribe_audio_listener", { playerId: pid });
  const unsubscribe = options.registered.on("audio", (event) => {
    void bridge.handleAgentAudioEvent(event).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      p2aAudioDebug("bridge:handle_unhandled_rejection", {
        playerId: pid,
        requestId: event.requestId,
        message,
      });
    });
  });
  return {
    dispose: async () => {
      p2aAudioDebug("bridge:unsubscribe", { playerId: pid });
      unsubscribe();
      await bridge.dispose();
    },
  };
}
