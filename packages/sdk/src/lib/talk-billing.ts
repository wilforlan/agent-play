export const TALK_PRICE_PER_60S_USD = 1.5;
export const TALK_PRICE_PER_SECOND_USD = 0.025;
export const TALK_TICK_SECONDS = 10;

export const costForSeconds = (seconds: number): number => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }
  const whole = Math.floor(seconds);
  return Math.round(whole * 25) / 1000;
};
