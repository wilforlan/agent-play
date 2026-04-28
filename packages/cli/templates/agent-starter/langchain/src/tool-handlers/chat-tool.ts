export function executeChatTool(args: { message?: string }): Record<string, unknown> {
  const message = typeof args.message === "string" ? args.message : "";
  return {
    reply: `Echo from __PROJECT_NAME__: ${message}`,
  };
}
