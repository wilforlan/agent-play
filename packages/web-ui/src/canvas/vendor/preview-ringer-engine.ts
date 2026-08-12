type RingerPlayText = (text: string) => Promise<void> | void;
type RingerPlayRingtone = (input: { durationMs: number }) => Promise<void> | void;

type RingerInput = {
  targetName: string;
  message: string;
};

function defaultGetIsPresent(): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return true;
  }
  const visible = document.hidden === false;
  const focused =
    typeof document.hasFocus === "function" ? document.hasFocus() : true;
  return visible && focused;
}

async function defaultPlayText(text: string): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }
  await new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

async function defaultPlayRingtone(input: { durationMs: number }): Promise<void> {
  if (typeof window === "undefined" || !("AudioContext" in window)) {
    return;
  }
  const ctx = new window.AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const createTone = (frequencyHz: number): OscillatorNode => {
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequencyHz;
    oscillator.connect(master);
    return oscillator;
  };

  const low = createTone(440);
  const high = createTone(480);
  const startedAt = ctx.currentTime;
  const durationSec = Math.max(input.durationMs, 1) / 1000;
  let pulseAt = startedAt;
  while (pulseAt < startedAt + durationSec) {
    master.gain.setValueAtTime(0.0001, pulseAt);
    master.gain.linearRampToValueAtTime(0.05, pulseAt + 0.02);
    master.gain.setValueAtTime(0.05, pulseAt + 0.32);
    master.gain.linearRampToValueAtTime(0.0001, pulseAt + 0.38);
    pulseAt += 0.55;
  }
  low.start(startedAt);
  high.start(startedAt);
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), input.durationMs);
  });
  low.stop();
  high.stop();
  await ctx.close();
}

export type PreviewRingerEngine = {
  playIncomingMessage: (input: RingerInput) => Promise<void>;
  startIncomingCallRing: () => Promise<void>;
  stopIncomingCallRing: () => void;
};

export function createPreviewRingerEngine(options?: {
  getIsPresent?: () => boolean;
  playText?: RingerPlayText;
  playRingtone?: RingerPlayRingtone;
  ringtoneDurationMs?: number;
}): PreviewRingerEngine {
  const getIsPresent = options?.getIsPresent ?? defaultGetIsPresent;
  const playText = options?.playText ?? defaultPlayText;
  const playRingtone = options?.playRingtone ?? defaultPlayRingtone;
  const ringtoneDurationMs = options?.ringtoneDurationMs ?? 1800;
  let ringGeneration = 0;

  const playIncomingMessage = async (input: RingerInput): Promise<void> => {
    const message = input.message.trim();
    if (message.length === 0) return;
    if (getIsPresent()) {
      await playText(message);
      return;
    }
    await playRingtone({ durationMs: 6000 });
    await playText(
      `Hello, you have an incoming message from ${input.targetName}. They have the following message: ${message}`
    );
  };

  const stopIncomingCallRing = (): void => {
    ringGeneration += 1;
  };

  const startIncomingCallRing = async (): Promise<void> => {
    const generation = ringGeneration + 1;
    ringGeneration = generation;
    while (ringGeneration === generation) {
      await playRingtone({ durationMs: ringtoneDurationMs });
      if (ringGeneration !== generation) {
        return;
      }
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 2200);
      });
    }
  };

  return {
    playIncomingMessage,
    startIncomingCallRing,
    stopIncomingCallRing,
  };
}
