export function extractAssistToolNames(toolNames: readonly string[]): string[] {
  return toolNames.filter((n) => n.startsWith("assist_"));
}

export function assertAgentToolContract(toolNames: readonly string[]): void {
  if (!toolNames.includes("chat_tool")) {
    throw new Error(
      'addPlayer: agent.toolNames must include "chat_tool" (required contract)'
    );
  }
}
