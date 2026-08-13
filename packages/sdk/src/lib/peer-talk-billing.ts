export const PEER_TALK_PRICE_PER_60S_USD = 0.12;
export const PEER_TALK_PRICE_PER_SECOND_USD = 0.002;
export const PEER_TALK_TICK_MIN_SECONDS = 7;
export const PEER_TALK_TICK_MAX_SECONDS = 15;

export const peerCostForSeconds = (seconds: number): number => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }
  const whole = Math.floor(seconds);
  return Math.round(whole * 2) / 1000;
};

export type NextPeerTalkTickSecondsOptions = {
  random?: () => number;
};

/**
 * Returns the next peer-talk billing delay in whole seconds, inclusive of
 * {@link PEER_TALK_TICK_MIN_SECONDS} and {@link PEER_TALK_TICK_MAX_SECONDS}.
 *
 * Pass a deterministic `random` (returning [0, 1)) in tests.
 */
export const nextPeerTalkTickSeconds = (
  randomOrOptions?: (() => number) | NextPeerTalkTickSecondsOptions
): number => {
  const random =
    typeof randomOrOptions === "function"
      ? randomOrOptions
      : (randomOrOptions?.random ?? Math.random);
  const span =
    PEER_TALK_TICK_MAX_SECONDS - PEER_TALK_TICK_MIN_SECONDS + 1;
  const raw = random();
  const unit = Number.isFinite(raw)
    ? Math.min(Math.max(raw, 0), 0.999999999999)
    : 0;
  return PEER_TALK_TICK_MIN_SECONDS + Math.floor(unit * span);
};
