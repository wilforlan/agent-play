export function executeAssistBrainstorm(args: {
  prompt?: string;
}): Record<string, unknown> {
  const prompt = typeof args.prompt === "string" ? args.prompt : "";
  return {
    summary: `Brainstorm starter for: ${prompt}`,
  };
}
