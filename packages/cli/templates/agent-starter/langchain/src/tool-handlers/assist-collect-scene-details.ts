export function executeAssistCollectSceneDetails(args: {
  location?: string;
  incidentType?: string;
  witnesses?: string;
  injuriesReported?: boolean;
  suspectDescription?: string;
  immediateRisk?: "low" | "medium" | "high";
}): Record<string, unknown> {
  const location = typeof args.location === "string" ? args.location : "";
  const incidentType =
    typeof args.incidentType === "string" ? args.incidentType : "";
  if (location.length === 0 || incidentType.length === 0) {
    return {
      ok: false,
      error: "location and incidentType are required.",
    };
  }
  return {
    ok: true,
    scene: {
      location,
      incidentType,
      witnesses: typeof args.witnesses === "string" ? args.witnesses : "",
      injuriesReported: args.injuriesReported === true,
      suspectDescription:
        typeof args.suspectDescription === "string"
          ? args.suspectDescription
          : "",
      immediateRisk: args.immediateRisk ?? "low",
    },
  };
}
