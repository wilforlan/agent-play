import { resolveToolCapabilityHandler } from "./tool-capability-registry.js";

export async function executeToolCapability(options: {
  toolName: string;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const handler = resolveToolCapabilityHandler(options.toolName);
  if (handler === null) {
    throw new Error(`unknown tool capability: ${options.toolName}`);
  }
  return await Promise.resolve(handler(options.args));
}
