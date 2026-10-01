import { z } from "zod";

export type ArcadeAccessPlan = "day" | "week";

export type ArcadeTender = "apu" | "apw";

export const ArcadeAccessPlanSchema = z.enum(["day", "week"]);
export const ArcadeTenderSchema = z.enum(["apu", "apw"]);

export const ArcadeAccessPassSchema = z.object({
  plan: ArcadeAccessPlanSchema,
  purchasedAt: z.string().min(1),
  expiresAt: z.string().min(1),
  tender: ArcadeTenderSchema,
  apuCost: z.number().int().positive(),
  apwCharged: z.number().finite().nonnegative(),
});

export type ArcadeAccessPass = z.infer<typeof ArcadeAccessPassSchema>;

export const ARCADE_DAY_PASS_APU = 25;
export const ARCADE_DAY_PASS_HOURS = 24;
export const ARCADE_WEEK_PASS_DAYS = 7;
export const ARCADE_WEEK_DISCOUNT = 0.2;

export const arcadeDayPassApuCost = (): number => ARCADE_DAY_PASS_APU;

export const arcadeWeekPassApuCost = (): number =>
  Math.round(
    ARCADE_DAY_PASS_APU * ARCADE_WEEK_PASS_DAYS * (1 - ARCADE_WEEK_DISCOUNT)
  );

export const arcadePassApuCost = (plan: ArcadeAccessPlan): number =>
  plan === "day" ? arcadeDayPassApuCost() : arcadeWeekPassApuCost();

export const quoteArcadePassApw = (input: {
  plan: ArcadeAccessPlan;
  apwPerApu: number;
}): number => {
  if (!Number.isFinite(input.apwPerApu) || input.apwPerApu <= 0) {
    return 0;
  }
  const raw = arcadePassApuCost(input.plan) * input.apwPerApu;
  return Math.round(raw * 1e8) / 1e8;
};

export const chooseArcadeTender = (input: {
  powerUps: number;
  balanceUsd: number;
  apwPerApu: number;
}): ArcadeTender => {
  if (!Number.isFinite(input.apwPerApu) || input.apwPerApu <= 0) {
    return "apu";
  }
  const apuWealthApw = input.powerUps * input.apwPerApu;
  if (apuWealthApw >= input.balanceUsd) {
    return "apu";
  }
  return "apw";
};

export const resolveArcadeTenderForPurchase = (input: {
  plan: ArcadeAccessPlan;
  powerUps: number;
  balanceUsd: number;
  apwPerApu: number;
}): {
  tender: ArcadeTender;
  apuCost: number;
  apwCharged: number;
} | null => {
  const apuCost = arcadePassApuCost(input.plan);
  const apwCharged = quoteArcadePassApw({
    plan: input.plan,
    apwPerApu: input.apwPerApu,
  });
  const preferred = chooseArcadeTender(input);
  const canPayApu = input.powerUps >= apuCost;
  const canPayApw =
    Number.isFinite(input.apwPerApu) &&
    input.apwPerApu > 0 &&
    apwCharged > 0 &&
    input.balanceUsd >= apwCharged;

  if (preferred === "apu" && canPayApu) {
    return { tender: "apu", apuCost, apwCharged };
  }
  if (preferred === "apw" && canPayApw) {
    return { tender: "apw", apuCost, apwCharged };
  }
  if (preferred === "apu" && canPayApw) {
    return { tender: "apw", apuCost, apwCharged };
  }
  if (preferred === "apw" && canPayApu) {
    return { tender: "apu", apuCost, apwCharged };
  }
  return null;
};

export const buildArcadeAccessPass = (input: {
  plan: ArcadeAccessPlan;
  purchasedAt: string;
  tender: ArcadeTender;
  apuCost: number;
  apwCharged: number;
}): ArcadeAccessPass => {
  const purchasedMs = Date.parse(input.purchasedAt);
  const durationMs =
    input.plan === "day"
      ? ARCADE_DAY_PASS_HOURS * 60 * 60 * 1000
      : ARCADE_WEEK_PASS_DAYS * 24 * 60 * 60 * 1000;
  return {
    plan: input.plan,
    purchasedAt: input.purchasedAt,
    expiresAt: new Date(purchasedMs + durationMs).toISOString(),
    tender: input.tender,
    apuCost: input.apuCost,
    apwCharged: input.apwCharged,
  };
};

export const isArcadeAccessActive = (
  pass: ArcadeAccessPass | null | undefined,
  now: Date = new Date()
): boolean => {
  if (pass === null || pass === undefined) {
    return false;
  }
  const expiresMs = Date.parse(pass.expiresAt);
  if (!Number.isFinite(expiresMs)) {
    return false;
  }
  return now.getTime() < expiresMs;
};
