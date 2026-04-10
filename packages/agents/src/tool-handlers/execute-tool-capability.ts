import { resolveToolCapabilityHandler } from "./tool-capability-registry.js";

export function executeToolCapability(options: {
  toolName: string;
  args: Record<string, unknown>;
}): Record<string, unknown> {
  const handler = resolveToolCapabilityHandler(options.toolName);
  if (handler === null) {
    throw new Error(`unknown tool capability: ${options.toolName}`);
  }
  return handler(options.args);
}
