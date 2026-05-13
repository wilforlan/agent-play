export const TALK_AGENT_PU_BILLED_SECONDS_PER_UNIT = 10;
export const TALK_AGENT_PU_MAX_PER_LEG = 5;

export type ComputeTalkAgentPowerUpsEarnedInput = {
  billedWholeSeconds: number;
  costUsd: number;
};

export const computeTalkAgentPowerUpsEarned = (
  input: ComputeTalkAgentPowerUpsEarnedInput
): number => {
  if (!Number.isFinite(input.costUsd) || input.costUsd <= 0) {
    return 0;
  }
  if (
    !Number.isFinite(input.billedWholeSeconds) ||
    input.billedWholeSeconds <= 0
  ) {
    return 0;
  }
  const whole = Math.floor(input.billedWholeSeconds);
  const raw = Math.floor(whole / TALK_AGENT_PU_BILLED_SECONDS_PER_UNIT);
  return Math.min(TALK_AGENT_PU_MAX_PER_LEG, Math.max(0, raw));
};
