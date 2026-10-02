import { z } from "zod";
import {
  chooseArcadeTender,
  type ArcadeTender,
} from "./arcade-access-catalog.js";

export type EducationTender = ArcadeTender;

export const EducationTenderSchema = z.enum(["apu", "apw"]);

export const EDUCATION_CENTER_IDS = [
  "foundations-hall",
  "curriculum-tower",
  "assessment-atelier",
  "classroom-studio",
] as const;

export type EducationCenterId = (typeof EDUCATION_CENTER_IDS)[number];

export const EducationCenterIdSchema = z.enum(EDUCATION_CENTER_IDS);

export const EDUCATION_CENTER_DAY_PASS_APU = 5;

export const EducationAccessPassSchema = z.object({
  centerId: EducationCenterIdSchema,
  utcDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  purchasedAt: z.string().min(1),
  expiresAt: z.string().min(1),
  tender: EducationTenderSchema,
  apuCost: z.number().int().positive(),
  apwCharged: z.number().finite().nonnegative(),
});

export type EducationAccessPass = z.infer<typeof EducationAccessPassSchema>;

export const educationCenterDayPassApuCost = (): number =>
  EDUCATION_CENTER_DAY_PASS_APU;

export const utcDayKey = (now: Date): string =>
  now.toISOString().slice(0, 10);

export const utcDayEndIso = (now: Date): string => {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  return new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0)).toISOString();
};

export const quoteEducationCenterDayPassApw = (input: {
  apwPerApu: number;
}): number => {
  if (!Number.isFinite(input.apwPerApu) || input.apwPerApu <= 0) {
    return 0;
  }
  const raw = educationCenterDayPassApuCost() * input.apwPerApu;
  return Math.round(raw * 1e8) / 1e8;
};

export const chooseEducationTender = chooseArcadeTender;

export const resolveEducationTenderForPurchase = (input: {
  powerUps: number;
  balanceUsd: number;
  apwPerApu: number;
}): {
  tender: EducationTender;
  apuCost: number;
  apwCharged: number;
} | null => {
  const apuCost = educationCenterDayPassApuCost();
  const apwCharged = quoteEducationCenterDayPassApw({
    apwPerApu: input.apwPerApu,
  });
  const preferred = chooseEducationTender(input);
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

export const buildEducationAccessPass = (input: {
  centerId: EducationCenterId;
  purchasedAt: string;
  tender: EducationTender;
  apuCost: number;
  apwCharged: number;
}): EducationAccessPass => {
  const purchasedAtDate = new Date(input.purchasedAt);
  return {
    centerId: input.centerId,
    utcDay: utcDayKey(purchasedAtDate),
    purchasedAt: input.purchasedAt,
    expiresAt: utcDayEndIso(purchasedAtDate),
    tender: input.tender,
    apuCost: input.apuCost,
    apwCharged: input.apwCharged,
  };
};

export const isEducationAccessActive = (
  pass: EducationAccessPass | null | undefined,
  now: Date = new Date()
): boolean => {
  if (pass === null || pass === undefined) {
    return false;
  }
  if (pass.utcDay !== utcDayKey(now)) {
    return false;
  }
  const expiresMs = Date.parse(pass.expiresAt);
  if (!Number.isFinite(expiresMs)) {
    return false;
  }
  return now.getTime() < expiresMs;
};

export const isEducationCenterId = (value: string): value is EducationCenterId =>
  (EDUCATION_CENTER_IDS as readonly string[]).includes(value);
