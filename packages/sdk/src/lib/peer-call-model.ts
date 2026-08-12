import { z } from "zod";

export const PEER_CALL_PROXIMITY_RADIUS = 0.72;

export const PEER_CALL_INVITE_TIMEOUT_MS = 45_000;

export const PeerCallStatusSchema = z.enum([
  "ringing",
  "active",
  "ended",
  "declined",
  "missed",
  "failed",
]);

export type PeerCallStatus = z.infer<typeof PeerCallStatusSchema>;

export const PeerCallEndReasonSchema = z.enum([
  "hangup",
  "decline",
  "timeout",
  "insufficient_funds",
  "error",
]);

export type PeerCallEndReason = z.infer<typeof PeerCallEndReasonSchema>;

export const PeerCallRecordSchema = z.object({
  callId: z.string().min(1),
  sid: z.string().min(1),
  callerId: z.string().min(1),
  calleeId: z.string().min(1),
  status: PeerCallStatusSchema,
  createdAt: z.string().min(1),
  answeredAt: z.string().min(1).optional(),
  endedAt: z.string().min(1).optional(),
  endReason: PeerCallEndReasonSchema.optional(),
});

export type PeerCallRecord = z.infer<typeof PeerCallRecordSchema>;

export const parsePeerCallRecord = (value: unknown): PeerCallRecord =>
  PeerCallRecordSchema.parse(value);

export const peerCallDistance = (a: {
  x: number;
  y: number;
}, b: {
  x: number;
  y: number;
}): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
};

export const arePeersWithinCallProximity = (input: {
  caller: { x: number; y: number };
  callee: { x: number; y: number };
  radius?: number;
}): boolean => {
  const radius = input.radius ?? PEER_CALL_PROXIMITY_RADIUS;
  return peerCallDistance(input.caller, input.callee) <= radius;
};
