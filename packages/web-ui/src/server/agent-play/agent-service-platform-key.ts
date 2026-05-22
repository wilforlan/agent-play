import { timingSafeEqual } from "node:crypto";

export const AGENT_SERVICE_PLATFORM_KEY_HEADER = "x-agent-service-key";

export function getConfiguredAgentServiceKey(): string | null {
  const key = process.env.AGENT_SERVICE_KEY?.trim() ?? "";
  return key.length > 0 ? key : null;
}

export function verifyAgentServicePlatformKey(req: Request): Response | null {
  const expected = getConfiguredAgentServiceKey();
  if (expected === null) {
    return null;
  }
  const provided = req.headers.get(AGENT_SERVICE_PLATFORM_KEY_HEADER)?.trim() ?? "";
  if (provided.length === 0) {
    return Response.json({ error: "missing_agent_service_key" }, { status: 403 });
  }
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
    return Response.json({ error: "invalid_agent_service_key" }, { status: 403 });
  }
  return null;
}
