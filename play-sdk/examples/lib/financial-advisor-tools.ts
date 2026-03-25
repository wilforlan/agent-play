import { tool } from "langchain";
import type { Interface } from "node:readline/promises";
import { z } from "zod";

const riskBucketSchema = z.enum([
  "conservative",
  "moderate_conservative",
  "moderate",
  "moderate_aggressive",
  "aggressive",
]);

function marginRateSingle2024(taxableIncome: number): number {
  const b = taxableIncome;
  if (b <= 11600) return 0.1;
  if (b <= 47150) return 0.12;
  if (b <= 100525) return 0.22;
  if (b <= 191950) return 0.24;
  if (b <= 243725) return 0.32;
  if (b <= 609350) return 0.35;
  return 0.37;
}

function marginRateMfj2024(taxableIncome: number): number {
  const b = taxableIncome;
  if (b <= 23200) return 0.1;
  if (b <= 94300) return 0.12;
  if (b <= 201050) return 0.22;
  if (b <= 383900) return 0.24;
  if (b <= 487450) return 0.32;
  if (b <= 731200) return 0.35;
  return 0.37;
}

export function createFinancialAdvisorTools(cli: Interface) {
  const disclaimer = tool(
    () =>
      "Educational planning session only—not personalized investment, tax, or legal advice. " +
      "Numbers are illustrative; verify with professionals before acting.",
    {
      name: "session_disclosure",
      description:
        "Call once per session to record that guidance is educational and not a substitute for licensed professional advice.",
      schema: z.object({}),
    }
  );

  const requestHumanApproval = tool(
    async ({ question }: { question: string }) => {
      const line = (
        await cli.question(
          `\n[Approval required]\n${question}\nAnswer yes or no (y/n): `
        )
      )
        .trim()
        .toLowerCase();
      const ok = line === "y" || line === "yes";
      return ok
        ? "Human decision: APPROVED. You may continue with the proposed next step."
        : "Human decision: NOT APPROVED. Stop the current recommendation path; offer alternatives or ask clarifying questions.";
    },
    {
      name: "request_human_approval",
      description:
        "Use when a material recommendation or next step should be explicitly approved by the human (opens CLI prompt).",
      schema: z.object({
        question: z
          .string()
          .describe("Clear yes/no question about proceeding with a proposed plan element."),
      }),
    }
  );

  const requestHumanInput = tool(
    async ({ prompt }: { prompt: string }) => {
      const line = (await cli.question(`\n[Your advisor asks]\n${prompt}\n> `)).trim();
      return line.length > 0
        ? line
        : "(no response entered; treat as unknown and ask again conversationally)";
    },
    {
      name: "request_human_input",
      description:
        "Use when you need a specific fact, figure, or free-text detail from the human (opens CLI prompt). Prefer this instead of guessing.",
      schema: z.object({
        prompt: z.string().describe("Single concise question for the client at the terminal."),
      }),
    }
  );

  const clientFactsSnapshot = tool(
    ({
      name,
      age,
      dependents,
      annualIncome,
      notes,
    }: {
      name: string;
      age: number;
      dependents: number;
      annualIncome: number;
      notes?: string;
    }) =>
      `Client record (illustrative): ${name}, age ${age}, dependents ${dependents}, annual income $${annualIncome.toLocaleString()}.` +
      (notes ? ` Notes: ${notes}` : ""),
    {
      name: "client_facts_snapshot",
      description:
        "Summarize confirmed client facts for the planning file after discovery (identity, age, dependents, rough income).",
      schema: z.object({
        name: z.string(),
        age: z.number().int().min(18).max(110),
        dependents: z.number().int().min(0).max(20),
        annualIncome: z.number().nonnegative(),
        notes: z.string().optional(),
      }),
    }
  );

  const assessRiskTolerance = tool(
    ({
      investmentHorizonYears,
      drawdownDiscomfort0to100,
      liquidityStress,
    }: {
      investmentHorizonYears: number;
      drawdownDiscomfort0to100: number;
      liquidityStress: "low" | "moderate" | "high";
    }) => {
      let score =
        investmentHorizonYears * 2 + drawdownDiscomfort0to100 * 0.25;
      if (liquidityStress === "high") score -= 18;
      if (liquidityStress === "low") score += 8;
      const bucket =
        score < 35
          ? "conservative"
          : score < 55
            ? "moderate_conservative"
            : score < 75
              ? "moderate"
              : score < 95
                ? "moderate_aggressive"
                : "aggressive";
      return `Heuristic risk bucket: ${bucket} (horizon ${investmentHorizonYears}y, drawdown discomfort 0–100=${drawdownDiscomfort0to100}, liquidity stress=${liquidityStress}). Validate with a formal questionnaire.`;
    },
    {
      name: "assess_risk_tolerance",
      description:
        "Map time horizon, drawdown discomfort score (0 comfortable, 100 very uncomfortable), and liquidity stress into a heuristic risk posture label.",
      schema: z.object({
        investmentHorizonYears: z.number().min(1).max(80),
        drawdownDiscomfort0to100: z
          .number()
          .min(0)
          .max(100),
        liquidityStress: z.enum(["low", "moderate", "high"]).describe(
          "Near-term cash pressure: high = little runway for volatility."
        ),
      }),
    }
  );

  const cashFlowSnapshot = tool(
    ({
      monthlyTakeHome,
      monthlyEssentialSpend,
      monthlyDiscretionary,
    }: {
      monthlyTakeHome: number;
      monthlyEssentialSpend: number;
      monthlyDiscretionary: number;
    }) => {
      const surplus =
        monthlyTakeHome - monthlyEssentialSpend - monthlyDiscretionary;
      const rate =
        monthlyTakeHome > 0 ? (surplus / monthlyTakeHome) * 100 : 0;
      return `Monthly surplus ~$${surplus.toFixed(0)} (${rate.toFixed(1)}% of take-home). Essentials $${monthlyEssentialSpend}, discretionary $${monthlyDiscretionary}.`;
    },
    {
      name: "cash_flow_snapshot",
      description: "Estimate monthly surplus and savings rate from take-home and spending buckets.",
      schema: z.object({
        monthlyTakeHome: z.number().nonnegative(),
        monthlyEssentialSpend: z.number().nonnegative(),
        monthlyDiscretionary: z.number().nonnegative(),
      }),
    }
  );

  const emergencyFundAssessment = tool(
    ({
      monthlyEssentialSpend,
      currentCashReserve,
      targetMonths,
    }: {
      monthlyEssentialSpend: number;
      currentCashReserve: number;
      targetMonths: number;
    }) => {
      const target = monthlyEssentialSpend * targetMonths;
      const gap = target - currentCashReserve;
      return gap <= 0
        ? `Emergency fund meets target (~${targetMonths} mo expenses).`
        : `Emergency fund short by ~$${gap.toFixed(0)} to reach ${targetMonths} months of essentials ($${target.toFixed(0)} target).`;
    },
    {
      name: "emergency_fund_assessment",
      description:
        "Compare cash reserve to a months-of-expenses target (commonly 3–6+ months essentials).",
      schema: z.object({
        monthlyEssentialSpend: z.number().positive(),
        currentCashReserve: z.number().nonnegative(),
        targetMonths: z.number().min(1).max(36),
      }),
    }
  );

  const debtPayoffPlan = tool(
    ({
      strategy,
      debts,
    }: {
      strategy: "avalanche" | "snowball";
      debts: { name: string; balance: number; aprPercent: number; minPayment: number }[];
    }) => {
      const ordered =
        strategy === "avalanche"
          ? [...debts].sort((a, b) => b.aprPercent - a.aprPercent)
          : [...debts].sort((a, b) => a.balance - b.balance);
      const order = ordered.map((d, i) => `${i + 1}. ${d.name} ($${d.balance}, ${d.aprPercent}% APR)`);
      return `${strategy} payoff priority:\n${order.join("\n")}. Extra payments go to #1 while paying minimums on the rest (illustrative).`;
    },
    {
      name: "debt_payoff_plan",
      description:
        "Order debts for avalanche (highest APR first) or snowball (smallest balance first) with minimum payments on others.",
      schema: z.object({
        strategy: z.enum(["avalanche", "snowball"]),
        debts: z.array(
          z.object({
            name: z.string(),
            balance: z.number().positive(),
            aprPercent: z.number().nonnegative(),
            minPayment: z.number().nonnegative(),
          })
        ),
      }),
    }
  );

  const retirementNeedRuleOfThumb = tool(
    ({
      currentAge,
      retirementAge,
      annualSpendingGoalToday,
      inflationPercent,
    }: {
      currentAge: number;
      retirementAge: number;
      annualSpendingGoalToday: number;
      inflationPercent: number;
    }) => {
      const years = Math.max(0, retirementAge - currentAge);
      const infl = 1 + inflationPercent / 100;
      const futureSpend = annualSpendingGoalToday * infl ** years;
      const lump25x = futureSpend * 25;
      return `Years to retirement: ${years}. Inflation-adjusted spending goal ~$${futureSpend.toFixed(0)}/yr (illustrative). 25x heuristic portfolio need ~$${lump25x.toLocaleString()} (not a guarantee).`;
    },
    {
      name: "retirement_need_rule_of_thumb",
      description:
        "Illustrative retirement need using years to retirement, spending goal, and simple inflation compounding plus a 25× spending lump-sum heuristic.",
      schema: z.object({
        currentAge: z.number().int().min(18).max(100),
        retirementAge: z.number().int().min(40).max(110),
        annualSpendingGoalToday: z.number().positive(),
        inflationPercent: z.number().min(0).max(15),
      }),
    }
  );

  const portfolioAllocationSuggestion = tool(
    ({ riskBucket }: { riskBucket: z.infer<typeof riskBucketSchema> }) => {
      const t: Record<string, { stocks: number; bonds: number; cash: number }> = {
        conservative: { stocks: 30, bonds: 55, cash: 15 },
        moderate_conservative: { stocks: 45, bonds: 45, cash: 10 },
        moderate: { stocks: 60, bonds: 35, cash: 5 },
        moderate_aggressive: { stocks: 75, bonds: 20, cash: 5 },
        aggressive: { stocks: 90, bonds: 8, cash: 2 },
      };
      const a = t[riskBucket];
      return `Illustrative allocation (${riskBucket}): ~${a.stocks}% equities, ~${a.bonds}% fixed income, ~${a.cash}% cash. Not a personalized recommendation.`;
    },
    {
      name: "portfolio_allocation_suggestion",
      description:
        "Translate a risk posture label into a generic stocks/bonds/cash illustration for discussion only.",
      schema: z.object({ riskBucket: riskBucketSchema }),
    }
  );

  const insuranceNeedsRough = tool(
    ({
      annualIncomeReplace,
      yearsToReplace,
      existingLifeCover,
    }: {
      annualIncomeReplace: number;
      yearsToReplace: number;
      existingLifeCover: number;
    }) => {
      const need = annualIncomeReplace * yearsToReplace - existingLifeCover;
      return `Rough human-life income replacement discussion need ~$${Math.max(0, need).toLocaleString()} (income ${annualIncomeReplace}/yr × ${yearsToReplace}y minus existing $${existingLifeCover} cover). Refer to licensed insurance professionals.`;
    },
    {
      name: "insurance_needs_rough",
      description:
        "Very rough income-replacement life insurance gap for conversation—not underwriting.",
      schema: z.object({
        annualIncomeReplace: z.number().nonnegative(),
        yearsToReplace: z.number().min(1).max(40),
        existingLifeCover: z.number().nonnegative(),
      }),
    }
  );

  const educationSavingsBallpark = tool(
    ({
      yearsToEnrollment,
      futureAnnualCost,
      expectedReturnPercent,
      currentSaved,
    }: {
      yearsToEnrollment: number;
      futureAnnualCost: number;
      expectedReturnPercent: number;
      currentSaved: number;
    }) => {
      const r = expectedReturnPercent / 100 / 12;
      const n = yearsToEnrollment * 12;
      const fvCollege = futureAnnualCost * 4 * 1.03;
      const fvSaved = currentSaved * (1 + expectedReturnPercent / 100) ** yearsToEnrollment;
      const gap = Math.max(0, fvCollege - fvSaved);
      if (r <= 0 || n <= 0) {
        return `Ballpark four-year cost ~$${fvCollege.toFixed(0)}; already have ~$${fvSaved.toFixed(0)}; illustrative gap ~$${gap.toFixed(0)}.`;
      }
      const pmt = (gap * r) / ((1 + r) ** n - 1);
      return `Illustrative college savings: need ~$${pmt.toFixed(0)}/mo for ${yearsToEnrollment}y at ${expectedReturnPercent}% to close a rough $${gap.toFixed(0)} gap vs hypothetical $${fvCollege.toFixed(0)} four-year horizon cost.`;
    },
    {
      name: "education_savings_ballpark",
      description:
        "Rough monthly savings suggestion toward a hypothetical college cost horizon (highly simplified).",
      schema: z.object({
        yearsToEnrollment: z.number().min(1).max(30),
        futureAnnualCost: z.number().positive(),
        expectedReturnPercent: z.number().min(0).max(15),
        currentSaved: z.number().nonnegative(),
      }),
    }
  );

  const goalFeasibility = tool(
    ({
      targetAmount,
      years,
      lumpSumToday,
      monthlyContribution,
      expectedReturnPercent,
    }: {
      targetAmount: number;
      years: number;
      lumpSumToday: number;
      monthlyContribution: number;
      expectedReturnPercent: number;
    }) => {
      const r = expectedReturnPercent / 100 / 12;
      const n = years * 12;
      const fvLump = lumpSumToday * (1 + expectedReturnPercent / 100) ** years;
      const fvStream =
        r > 0 && n > 0
          ? monthlyContribution * (((1 + r) ** n - 1) / r)
          : monthlyContribution * n;
      const total = fvLump + fvStream;
      const delta = targetAmount - total;
      return delta <= 0
        ? `Goal $${targetAmount.toLocaleString()} appears reachable under assumptions (FV ~$${total.toFixed(0)}). Stress-test lower returns and higher inflation.`
        : `Under assumptions, projected ~$${total.toFixed(0)} vs goal $${targetAmount.toLocaleString()}—short ~$${delta.toFixed(0)}. Increase contributions, extend timeline, or adjust goal.`;
    },
    {
      name: "goal_feasibility",
      description:
        "Combine lump sum and monthly savings with a return assumption to judge progress toward a numeric goal.",
      schema: z.object({
        targetAmount: z.number().positive(),
        years: z.number().min(0).max(80),
        lumpSumToday: z.number().nonnegative(),
        monthlyContribution: z.number().nonnegative(),
        expectedReturnPercent: z.number().min(0).max(20),
      }),
    }
  );

  const taxBracketSnapshot = tool(
    ({
      taxableIncome,
      filingStatus,
    }: {
      taxableIncome: number;
      filingStatus: "single" | "mfj";
    }) => {
      const rate =
        filingStatus === "mfj"
          ? marginRateMfj2024(taxableIncome)
          : marginRateSingle2024(taxableIncome);
      return `Illustrative federal ordinary marginal rate ~${(rate * 100).toFixed(0)}% on the next dollar (${filingStatus}, taxable income $${taxableIncome.toLocaleString()}). Simplified 2024-style brackets for education only; not tax advice.`;
    },
    {
      name: "tax_bracket_snapshot",
      description:
        "Show a simplified federal marginal bracket illustration for discussion (not tax preparation).",
      schema: z.object({
        taxableIncome: z.number().nonnegative(),
        filingStatus: z.enum(["single", "mfj"]),
      }),
    }
  );

  const estatePlanningChecklist = tool(
    ({ hasWill, hasHealthcareProxy, hasBeneficiaryReview }: {
      hasWill: boolean;
      hasHealthcareProxy: boolean;
      hasBeneficiaryReview: boolean;
    }) => {
      const missing: string[] = [];
      if (!hasWill) missing.push("will/trust coordination with an attorney");
      if (!hasHealthcareProxy) missing.push("healthcare directive / proxy");
      if (!hasBeneficiaryReview) missing.push("beneficiary alignment on retirement accounts and insurance");
      return missing.length === 0
        ? "Estate basics appear addressed at a high level—still confirm with an estate attorney."
        : `Consider prioritizing: ${missing.join("; ")}.`;
    },
    {
      name: "estate_planning_checklist",
      description:
        "High-level estate/title/beneficiary checklist flags—not legal advice.",
      schema: z.object({
        hasWill: z.boolean(),
        hasHealthcareProxy: z.boolean(),
        hasBeneficiaryReview: z.boolean(),
      }),
    }
  );

  const socialSecurityTimingNarrative = tool(
    ({
      fraYears,
      monthlyBenefitAtFra,
      claimEarlyReductionPercent,
    }: {
      fraYears: number;
      monthlyBenefitAtFra: number;
      claimEarlyReductionPercent: number;
    }) => {
      const early = monthlyBenefitAtFra * (1 - claimEarlyReductionPercent / 100);
      return `If FRA benefit ~$${monthlyBenefitAtFra}/mo at age ${fraYears}, an illustrative early claim at ~${claimEarlyReductionPercent}% reduction yields ~$${early.toFixed(0)}/mo. Longevity, spousal rules, and tax torpedoes require a specialist—this is narrative only.`;
    },
    {
      name: "social_security_timing_narrative",
      description:
        "Illustrative early vs FRA Social Security dollar comparison for education—refer to SSA + specialists.",
      schema: z.object({
        fraYears: z.number().min(62).max(70),
        monthlyBenefitAtFra: z.number().positive(),
        claimEarlyReductionPercent: z.number().min(0).max(35),
      }),
    }
  );

  return [
    disclaimer,
    requestHumanApproval,
    requestHumanInput,
    clientFactsSnapshot,
    assessRiskTolerance,
    cashFlowSnapshot,
    emergencyFundAssessment,
    debtPayoffPlan,
    retirementNeedRuleOfThumb,
    portfolioAllocationSuggestion,
    insuranceNeedsRough,
    educationSavingsBallpark,
    goalFeasibility,
    taxBracketSnapshot,
    estatePlanningChecklist,
    socialSecurityTimingNarrative,
  ];
}
