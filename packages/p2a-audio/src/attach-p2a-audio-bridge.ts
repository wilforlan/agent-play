import type { RegisteredPlayer } from "@agent-play/sdk";
import type { RemotePlayWorld } from "@agent-play/sdk";
import { p2aAudioDebug, p2aAudioTrace } from "./p2a-audio-log.js";

export type AttachP2aAudioBridgeOptions = {
  world: RemotePlayWorld;
  registered: RegisteredPlayer;
  openaiApiKey: string;
  model?: string;
};

export type P2aAudioBridge = {
  dispose: () => Promise<void>;
};

export function attachP2aAudioBridge(options: AttachP2aAudioBridgeOptions): P2aAudioBridge {
  const playerId = options.registered.id;
  p2aAudioTrace("bridge:deprecated_noop", { playerId });
  p2aAudioDebug("bridge:deprecated_noop", { playerId });

  const dispose = async (): Promise<void> => {
    p2aAudioDebug("bridge:dispose", { playerId });
  };

  return { dispose };
}

export function subscribeP2aAudioBridge(options: AttachP2aAudioBridgeOptions): {
  dispose: () => Promise<void>;
} {
  const bridge = attachP2aAudioBridge(options);
  const pid = options.registered.id;
  p2aAudioDebug("bridge:deprecated_no_subscription", { playerId: pid });
  return {
    dispose: async () => {
      p2aAudioDebug("bridge:dispose_deprecated_subscription", { playerId: pid });
      await bridge.dispose();
    },
  };
}
