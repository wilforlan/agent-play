function normalizeEquation(equation: string): string {
  return equation.replace(/\s+/g, "");
}

export function executeAssistCalculateCoefficient(args: {
  equation?: string;
  variable?: string;
}): Record<string, unknown> {
  const equation = typeof args.equation === "string" ? args.equation : "";
  const variable = typeof args.variable === "string" ? args.variable : "";
  if (equation.length === 0 || variable.length === 0) {
    return {
      ok: false,
      error: "equation and variable are required.",
    };
  }
  const normalized = normalizeEquation(equation);
  const regex = new RegExp(`([+-]?\\d*\\.?\\d*)${variable}`);
  const match = normalized.match(regex);
  if (match === null) {
    return {
      ok: false,
      error: `No coefficient found for variable ${variable}.`,
    };
  }
  const raw = match[1];
  const coefficient =
    raw === "" || raw === "+" ? 1 : raw === "-" ? -1 : Number(raw);
  return {
    ok: Number.isFinite(coefficient),
    variable,
    coefficient,
    equation,
  };
}
