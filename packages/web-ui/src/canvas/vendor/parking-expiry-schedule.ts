import type { ParkingStreetContent } from "@agent-play/sdk/browser";
import { isParkingOccupantActive } from "@agent-play/sdk/browser";

export function nextParkingExpiryMs(
  street: ParkingStreetContent,
  nowMs: number
): number | null {
  let best: number | null = null;
  for (const spot of street.spots) {
    const occupant = spot.occupant;
    if (occupant === null || occupant.expiresAt === null) {
      continue;
    }
    const expiresMs = new Date(occupant.expiresAt).getTime();
    if (Number.isNaN(expiresMs) || expiresMs <= nowMs) {
      continue;
    }
    if (!isParkingOccupantActive({ expiresAt: occupant.expiresAt, nowIso: new Date(nowMs).toISOString() })) {
      continue;
    }
    if (best === null || expiresMs < best) {
      best = expiresMs;
    }
  }
  return best;
}

export function createParkingExpiryScheduler(options: {
  getStreet: () => ParkingStreetContent;
  onExpire: () => void;
  nowMs?: () => number;
  setTimer?: (fn: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (id: ReturnType<typeof setTimeout>) => void;
}): { schedule(): void; cancel(): void } {
  const nowMs = options.nowMs ?? (() => Date.now());
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const cancel = (): void => {
    if (timerId !== null) {
      clearTimer(timerId);
      timerId = null;
    }
  };

  const schedule = (): void => {
    cancel();
    const nextAt = nextParkingExpiryMs(options.getStreet(), nowMs());
    if (nextAt === null) {
      return;
    }
    const delayMs = Math.max(0, nextAt - nowMs()) + 50;
    timerId = setTimer(() => {
      timerId = null;
      options.onExpire();
      schedule();
    }, delayMs);
  };

  return { schedule, cancel };
}
