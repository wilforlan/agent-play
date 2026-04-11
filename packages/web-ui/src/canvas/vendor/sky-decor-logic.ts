export const SKY_GREETINGS: readonly string[] = [
  "Hello",
  "Welcome",
  "Have fun",
  "Play together",
  "Good vibes",
  "Explore",
  "Say hi",
  "Enjoy Agent Play",
  "Fly high",
  "Dream big",
];

export function pickGreeting(rng: () => number): string {
  const idx = Math.floor(rng() * SKY_GREETINGS.length);
  const g = SKY_GREETINGS[idx];
  return g ?? SKY_GREETINGS[0];
}

export function nextMarqueeOffset(options: {
  offset: number;
  dt: number;
  textWidth: number;
  bannerWidth: number;
  speedPxPerSec: number;
}): number {
  const { offset, dt, textWidth, bannerWidth, speedPxPerSec } = options;
  let x = offset - speedPxPerSec * dt;
  const limit = -textWidth - 12;
  if (x < limit) {
    return bannerWidth;
  }
  return x;
}

export function isPlaneOffScreen(options: {
  noseX: number;
  viewWidth: number;
  marginPx?: number;
}): boolean {
  const margin = options.marginPx ?? 120;
  return options.noseX > options.viewWidth + margin;
}
