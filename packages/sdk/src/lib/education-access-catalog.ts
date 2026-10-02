import { z } from "zod";
import {
  chooseArcadeTender,
  type ArcadeTender,
} from "./arcade-access-catalog.js";

export type EducationTender = ArcadeTender;

export const EducationTenderSchema = z.enum(["apu", "apw"]);

export const EDUCATION_FACULTY_IDS = [
  "faculty-art",
  "faculty-science",
  "faculty-medicine",
  "faculty-education",
] as const;

export type EducationFacultyId = (typeof EDUCATION_FACULTY_IDS)[number];

export const EducationFacultyIdSchema = z.enum(EDUCATION_FACULTY_IDS);

export const LEGACY_EDUCATION_CENTER_TO_FACULTY = {
  "foundations-hall": "faculty-art",
  "curriculum-tower": "faculty-science",
  "assessment-atelier": "faculty-medicine",
  "classroom-studio": "faculty-education",
} as const;

export type LegacyEducationCenterId =
  keyof typeof LEGACY_EDUCATION_CENTER_TO_FACULTY;

/** @deprecated Use EDUCATION_FACULTY_IDS */
export const EDUCATION_CENTER_IDS = [
  ...EDUCATION_FACULTY_IDS,
  ...(Object.keys(LEGACY_EDUCATION_CENTER_TO_FACULTY) as LegacyEducationCenterId[]),
] as const;

/** @deprecated Use EducationFacultyId */
export type EducationCenterId = EducationFacultyId | LegacyEducationCenterId;

export const isEducationFacultyId = (
  value: string
): value is EducationFacultyId =>
  (EDUCATION_FACULTY_IDS as readonly string[]).includes(value);

export const normalizeEducationFacultyId = (
  value: string
): EducationFacultyId | null => {
  if (isEducationFacultyId(value)) {
    return value;
  }
  if (value in LEGACY_EDUCATION_CENTER_TO_FACULTY) {
    return LEGACY_EDUCATION_CENTER_TO_FACULTY[
      value as LegacyEducationCenterId
    ];
  }
  return null;
};

/** @deprecated Use isEducationFacultyId / normalizeEducationFacultyId */
export const isEducationCenterId = (value: string): value is EducationCenterId =>
  normalizeEducationFacultyId(value) !== null;

export const EducationCenterIdSchema = z
  .string()
  .refine((value): value is EducationCenterId => isEducationCenterId(value))
  .transform((value) => normalizeEducationFacultyId(value) as EducationFacultyId);

export const EDUCATION_CENTER_DAY_PASS_APU = 5;
export const EDUCATION_FACULTY_DAY_PASS_APU = EDUCATION_CENTER_DAY_PASS_APU;

export const EducationAccessPassSchema = z.preprocess((raw) => {
  if (typeof raw !== "object" || raw === null) {
    return raw;
  }
  const record = raw as Record<string, unknown>;
  if (typeof record.facultyId === "string") {
    const facultyId = normalizeEducationFacultyId(record.facultyId);
    return facultyId === null ? record : { ...record, facultyId };
  }
  if (typeof record.centerId === "string") {
    const facultyId = normalizeEducationFacultyId(record.centerId);
    return facultyId === null ? record : { ...record, facultyId };
  }
  return record;
}, z.object({
  facultyId: EducationFacultyIdSchema,
  utcDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  purchasedAt: z.string().min(1),
  expiresAt: z.string().min(1),
  tender: EducationTenderSchema,
  apuCost: z.number().int().positive(),
  apwCharged: z.number().finite().nonnegative(),
}));

export type EducationAccessPass = z.infer<typeof EducationAccessPassSchema>;

export const educationCenterDayPassApuCost = (): number =>
  EDUCATION_CENTER_DAY_PASS_APU;

export const educationFacultyDayPassApuCost = educationCenterDayPassApuCost;

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
  facultyId?: EducationFacultyId;
  /** @deprecated use facultyId */
  centerId?: EducationCenterId;
  purchasedAt: string;
  tender: EducationTender;
  apuCost: number;
  apwCharged: number;
}): EducationAccessPass => {
  const rawId = input.facultyId ?? input.centerId;
  if (rawId === undefined) {
    throw new Error("facultyId required");
  }
  const facultyId = normalizeEducationFacultyId(rawId);
  if (facultyId === null) {
    throw new Error(`Invalid faculty id ${rawId}`);
  }
  const purchasedAtDate = new Date(input.purchasedAt);
  return {
    facultyId,
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
