import { describe, expect, it } from "vitest";
import {
  TALK_AGENT_PU_BILLED_SECONDS_PER_UNIT,
  TALK_AGENT_PU_MAX_PER_LEG,
  computeTalkAgentPowerUpsEarned,
} from "./talk-agent-reward.js";

describe("computeTalkAgentPowerUpsEarned", () => {
  it("returns zero when no viewer charge", () => {
    expect(
      computeTalkAgentPowerUpsEarned({
        billedWholeSeconds: 10,
        costUsd: 0,
      })
    ).toBe(0);
    expect(
      computeTalkAgentPowerUpsEarned({
        billedWholeSeconds: 10,
        costUsd: -1,
      })
    ).toBe(0);
  });

  it("returns zero when no billed seconds", () => {
    expect(
      computeTalkAgentPowerUpsEarned({ billedWholeSeconds: 0, costUsd: 0.25 })
    ).toBe(0);
  });

  it("grants one PU per full TALK_AGENT_PU_BILLED_SECONDS_PER_UNIT seconds", () => {
    expect(
      computeTalkAgentPowerUpsEarned({
        billedWholeSeconds: 9,
        costUsd: 0.01,
      })
    ).toBe(0);
    expect(
      computeTalkAgentPowerUpsEarned({
        billedWholeSeconds: 10,
        costUsd: 0.01,
      })
    ).toBe(1);
    expect(
      computeTalkAgentPowerUpsEarned({
        billedWholeSeconds: 19,
        costUsd: 0.01,
      })
    ).toBe(1);
    expect(
      computeTalkAgentPowerUpsEarned({
        billedWholeSeconds: 20,
        costUsd: 0.01,
      })
    ).toBe(2);
  });

  it("caps at TALK_AGENT_PU_MAX_PER_LEG", () => {
    expect(
      computeTalkAgentPowerUpsEarned({
        billedWholeSeconds: 1000,
        costUsd: 1,
      })
    ).toBe(TALK_AGENT_PU_MAX_PER_LEG);
  });

  it("uses floor for fractional seconds input", () => {
    expect(
      computeTalkAgentPowerUpsEarned({
        billedWholeSeconds: 10.9,
        costUsd: 0.5,
      })
    ).toBe(1);
  });

  it("documents default constants", () => {
    expect(TALK_AGENT_PU_BILLED_SECONDS_PER_UNIT).toBe(10);
    expect(TALK_AGENT_PU_MAX_PER_LEG).toBe(5);
  });
});
