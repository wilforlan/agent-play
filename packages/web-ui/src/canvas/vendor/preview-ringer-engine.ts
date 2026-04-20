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
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.04;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), input.durationMs);
  });
  oscillator.stop();
  await ctx.close();
}

export function createPreviewRingerEngine(options?: {
  getIsPresent?: () => boolean;
  playText?: RingerPlayText;
  playRingtone?: RingerPlayRingtone;
}): {
  playIncomingMessage: (input: RingerInput) => Promise<void>;
} {
  const getIsPresent = options?.getIsPresent ?? defaultGetIsPresent;
  const playText = options?.playText ?? defaultPlayText;
  const playRingtone = options?.playRingtone ?? defaultPlayRingtone;

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

  return { playIncomingMessage };
}
