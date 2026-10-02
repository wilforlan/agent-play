import { z } from "zod";
import {
  chooseArcadeTender,
  type ArcadeTender,
} from "./arcade-access-catalog.js";
import {
  EducationFacultyIdSchema,
  type EducationFacultyId,
} from "./education-access-catalog.js";

export type EducationTender = ArcadeTender;

export const EDUCATION_TUITION_DAYS = 365;

export const EDUCATION_TUITION_APW_BY_TIER = {
  foundation: 450,
  intermediate: 675,
  advanced: 900,
} as const;

export type EducationPathTier = keyof typeof EDUCATION_TUITION_APW_BY_TIER;

export const EducationPathTierSchema = z.enum([
  "foundation",
  "intermediate",
  "advanced",
]);

export type EducationPathDef = {
  readonly pathId: EducationPathId;
  readonly facultyId: EducationFacultyId;
  readonly tier: EducationPathTier;
  readonly title: string;
  readonly summary: string;
  readonly tuitionApw: number;
};

export const EDUCATION_PATH_IDS = [
  "art-languages-communication",
  "art-history-philosophy",
  "art-visual-studio",
  "sci-mathematics",
  "sci-physical-life",
  "sci-computer-modeling",
  "med-nursing-fundamentals",
  "med-clinical-foundations",
  "med-research-methods",
  "edu-pedagogy-foundations",
  "edu-classroom-practice",
  "edu-curriculum-assessment",
] as const;

export type EducationPathId = (typeof EDUCATION_PATH_IDS)[number];

export const EDUCATION_PATH_DEFS: readonly EducationPathDef[] = [
  {
    pathId: "art-languages-communication",
    facultyId: "faculty-art",
    tier: "foundation",
    title: "Languages & Communication",
    summary:
      "Build precise reading, writing, and speaking skills for academic and civic life.",
    tuitionApw: 450,
  },
  {
    pathId: "art-history-philosophy",
    facultyId: "faculty-art",
    tier: "intermediate",
    title: "History & Philosophy",
    summary:
      "Trace ideas and events that shaped modern societies, then practice ethical reasoning.",
    tuitionApw: 675,
  },
  {
    pathId: "art-visual-studio",
    facultyId: "faculty-art",
    tier: "advanced",
    title: "Visual Arts Studio",
    summary:
      "Develop a personal studio practice through observation, composition, and critique.",
    tuitionApw: 900,
  },
  {
    pathId: "sci-mathematics",
    facultyId: "faculty-science",
    tier: "foundation",
    title: "Mathematics Foundations",
    summary:
      "Strengthen algebra, functions, and quantitative reasoning used across STEM.",
    tuitionApw: 450,
  },
  {
    pathId: "sci-physical-life",
    facultyId: "faculty-science",
    tier: "intermediate",
    title: "Physical & Life Sciences",
    summary:
      "Integrate core physics, chemistry, and biology ideas through inquiry.",
    tuitionApw: 675,
  },
  {
    pathId: "sci-computer-modeling",
    facultyId: "faculty-science",
    tier: "advanced",
    title: "Computer Science & Modeling",
    summary:
      "Learn algorithmic thinking and simple models that simulate scientific ideas.",
    tuitionApw: 900,
  },
  {
    pathId: "med-nursing-fundamentals",
    facultyId: "faculty-medicine",
    tier: "foundation",
    title: "Nursing Fundamentals",
    summary: "Patient dignity, vital signs literacy, and safe helper habits.",
    tuitionApw: 450,
  },
  {
    pathId: "med-clinical-foundations",
    facultyId: "faculty-medicine",
    tier: "intermediate",
    title: "Clinical Foundations",
    summary:
      "Build clinical reasoning with history, exam logic, and triage thinking.",
    tuitionApw: 675,
  },
  {
    pathId: "med-research-methods",
    facultyId: "faculty-medicine",
    tier: "advanced",
    title: "Medical Research Methods",
    summary:
      "Read studies critically and design ethical mini-investigations.",
    tuitionApw: 900,
  },
  {
    pathId: "edu-pedagogy-foundations",
    facultyId: "faculty-education",
    tier: "foundation",
    title: "Pedagogical Foundations",
    summary: "How learning works and why instructional choices matter.",
    tuitionApw: 450,
  },
  {
    pathId: "edu-classroom-practice",
    facultyId: "faculty-education",
    tier: "intermediate",
    title: "Classroom Practice",
    summary: "Facilitation, routines, and inclusive presence in real rooms.",
    tuitionApw: 675,
  },
  {
    pathId: "edu-curriculum-assessment",
    facultyId: "faculty-education",
    tier: "advanced",
    title: "Curriculum & Assessment Design",
    summary: "Sequence learning and assess with fairness and usefulness.",
    tuitionApw: 900,
  },
] as const;

export const EducationPathIdSchema = z.enum(EDUCATION_PATH_IDS);

export const EducationTuitionEnrollmentSchema = z.object({
  facultyId: EducationFacultyIdSchema,
  pathId: EducationPathIdSchema,
  tier: EducationPathTierSchema,
  purchasedAt: z.string().min(1),
  expiresAt: z.string().min(1),
  tender: z.enum(["apu", "apw"]),
  apuCost: z.number().int().positive(),
  apwCharged: z.number().finite().nonnegative(),
});

export type EducationTuitionEnrollment = z.infer<
  typeof EducationTuitionEnrollmentSchema
>;

export const isEducationPathId = (value: string): value is EducationPathId =>
  (EDUCATION_PATH_IDS as readonly string[]).includes(value);

export const getEducationPathDef = (
  pathId: string
): EducationPathDef | undefined =>
  EDUCATION_PATH_DEFS.find((p) => p.pathId === pathId);

export const listEducationPathsForFaculty = (
  facultyId: EducationFacultyId
): readonly EducationPathDef[] =>
  EDUCATION_PATH_DEFS.filter((p) => p.facultyId === facultyId);

export const quoteEducationTuitionApw = (input: {
  tier: EducationPathTier;
}): number => EDUCATION_TUITION_APW_BY_TIER[input.tier];

export const quoteEducationTuitionApu = (input: {
  tier: EducationPathTier;
  apwPerApu: number;
}): number => {
  if (!Number.isFinite(input.apwPerApu) || input.apwPerApu <= 0) {
    return 0;
  }
  const apw = quoteEducationTuitionApw({ tier: input.tier });
  return Math.ceil(apw / input.apwPerApu);
};

export const resolveEducationTuitionTender = (input: {
  tier: EducationPathTier;
  powerUps: number;
  balanceUsd: number;
  apwPerApu: number;
}): {
  tender: EducationTender;
  apuCost: number;
  apwCharged: number;
} | null => {
  const apwCharged = quoteEducationTuitionApw({ tier: input.tier });
  const apuCost = quoteEducationTuitionApu({
    tier: input.tier,
    apwPerApu: input.apwPerApu,
  });
  const preferred = chooseArcadeTender(input);
  const canPayApu = apuCost > 0 && input.powerUps >= apuCost;
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

export const buildEducationTuitionEnrollment = (input: {
  facultyId: EducationFacultyId;
  pathId: EducationPathId;
  purchasedAt: string;
  tender: EducationTender;
  apuCost: number;
  apwCharged: number;
}): EducationTuitionEnrollment => {
  const def = getEducationPathDef(input.pathId);
  if (def === undefined || def.facultyId !== input.facultyId) {
    throw new Error(`Invalid education path ${input.pathId}`);
  }
  const purchasedMs = Date.parse(input.purchasedAt);
  if (!Number.isFinite(purchasedMs)) {
    throw new Error("Invalid purchasedAt");
  }
  const expiresAt = new Date(
    purchasedMs + EDUCATION_TUITION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  return {
    facultyId: input.facultyId,
    pathId: input.pathId,
    tier: def.tier,
    purchasedAt: input.purchasedAt,
    expiresAt,
    tender: input.tender,
    apuCost: input.apuCost,
    apwCharged: input.apwCharged,
  };
};

export const isEducationTuitionActive = (
  enrollment: EducationTuitionEnrollment | null | undefined,
  now: Date = new Date()
): boolean => {
  if (enrollment === null || enrollment === undefined) {
    return false;
  }
  const expiresMs = Date.parse(enrollment.expiresAt);
  if (!Number.isFinite(expiresMs)) {
    return false;
  }
  return now.getTime() < expiresMs;
};
