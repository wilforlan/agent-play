type PlayBubble = () => Promise<void> | void;

const defaultPlayBubble = async (): Promise<void> => {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") {
    return;
  }
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(520, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    880,
    ctx.currentTime + 0.08
  );
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.18);
  await new Promise<void>((resolve) => {
    oscillator.onended = () => {
      void ctx.close().finally(() => resolve());
    };
  });
};

export type JoinBubbleSoundHandle = {
  playForJoin(input: { playerId: string }): Promise<void>;
};

export type CreateJoinBubbleSoundOptions = {
  readonly play?: PlayBubble;
  readonly getMuted?: () => boolean;
  readonly getLocalPlayerId?: () => string | null;
};

export const createJoinBubbleSound = (
  options: CreateJoinBubbleSoundOptions = {}
): JoinBubbleSoundHandle => {
  const play = options.play ?? defaultPlayBubble;
  const getMuted = options.getMuted ?? (() => false);
  const getLocalPlayerId = options.getLocalPlayerId ?? (() => null);

  return {
    playForJoin: async (input) => {
      const localId = getLocalPlayerId();
      if (localId !== null && localId === input.playerId) {
        return;
      }
      if (getMuted()) {
        return;
      }
      await play();
    },
  };
};
