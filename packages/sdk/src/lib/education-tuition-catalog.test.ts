import { describe, expect, it } from "vitest";
import {
  EDUCATION_TUITION_APW_BY_TIER,
  EDUCATION_TUITION_DAYS,
  buildEducationTuitionEnrollment,
  getEducationPathDef,
  isEducationPathId,
  isEducationTuitionActive,
  listEducationPathsForFaculty,
  quoteEducationTuitionApu,
  quoteEducationTuitionApw,
  resolveEducationTuitionTender,
} from "./education-tuition-catalog.js";
import {
  LEGACY_EDUCATION_CENTER_TO_FACULTY,
  isEducationFacultyId,
  normalizeEducationFacultyId,
} from "./education-access-catalog.js";

describe("education faculty ids", () => {
  it("maps legacy center ids to faculties", () => {
    expect(LEGACY_EDUCATION_CENTER_TO_FACULTY["foundations-hall"]).toBe(
      "faculty-art"
    );
    expect(normalizeEducationFacultyId("curriculum-tower")).toBe(
      "faculty-science"
    );
    expect(isEducationFacultyId("faculty-medicine")).toBe(true);
    expect(isEducationFacultyId("foundations-hall")).toBe(false);
  });
});

describe("education tuition catalog", () => {
  it("prices annual fees by path complexity tier", () => {
    expect(EDUCATION_TUITION_APW_BY_TIER.foundation).toBe(450);
    expect(EDUCATION_TUITION_APW_BY_TIER.intermediate).toBe(675);
    expect(EDUCATION_TUITION_APW_BY_TIER.advanced).toBe(900);
    expect(quoteEducationTuitionApw({ tier: "advanced" })).toBe(900);
  });

  it("quotes APU from live APW$ rate", () => {
    expect(
      quoteEducationTuitionApu({ tier: "foundation", apwPerApu: 0.1 })
    ).toBe(4500);
  });

  it("lists three Senior High paths per faculty", () => {
    const paths = listEducationPathsForFaculty("faculty-science");
    expect(paths).toHaveLength(3);
    expect(paths.map((p) => p.tier).sort()).toEqual([
      "advanced",
      "foundation",
      "intermediate",
    ]);
    expect(isEducationPathId("sci-mathematics")).toBe(true);
    expect(getEducationPathDef("sci-mathematics")?.tuitionApw).toBe(450);
  });

  it("builds a 365-day enrollment", () => {
    const enrollment = buildEducationTuitionEnrollment({
      facultyId: "faculty-art",
      pathId: "art-visual-studio",
      purchasedAt: "2026-10-02T12:00:00.000Z",
      tender: "apw",
      apuCost: 9000,
      apwCharged: 900,
    });
    expect(enrollment.tier).toBe("advanced");
    expect(EDUCATION_TUITION_DAYS).toBe(365);
    const expires = Date.parse(enrollment.expiresAt);
    const purchased = Date.parse(enrollment.purchasedAt);
    expect(expires - purchased).toBe(365 * 24 * 60 * 60 * 1000);
    expect(
      isEducationTuitionActive(enrollment, new Date("2027-10-01T12:00:00.000Z"))
    ).toBe(true);
    expect(
      isEducationTuitionActive(enrollment, new Date("2027-10-03T12:00:00.000Z"))
    ).toBe(false);
  });

  it("resolves dual-tender payment for tuition", () => {
    const resolved = resolveEducationTuitionTender({
      tier: "intermediate",
      powerUps: 0,
      balanceUsd: 700,
      apwPerApu: 0.1,
    });
    expect(resolved?.tender).toBe("apw");
    expect(resolved?.apwCharged).toBe(675);
  });
});
