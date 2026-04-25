import type {
  RealtimeWebrtcClientSecret,
  RemotePlayWorldOpenAiAudioOptions,
} from "../public-types.js";

export type ResolveRealtimeInstructionsOptions = {
  openai: RemotePlayWorldOpenAiAudioOptions;
  agentName: string;
};

/** Resolves OpenAI realtime instructions, preferring explicit text then template fallback. */
export function resolveRealtimeInstructions(
  options: ResolveRealtimeInstructionsOptions
): string | undefined {
  const explicit = options.openai.instructions?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    return explicit;
  }
  const template = options.openai.instructionsTemplate?.trim();
  if (template !== undefined && template.length > 0) {
    return template.replaceAll("{{agentName}}", options.agentName);
  }
  return `You are ${options.agentName}. Keep responses short, clear, and conversational unless asked for detail.`;
}

type MintOptions = ResolveRealtimeInstructionsOptions;

/**
 * Mints a short-lived OpenAI Realtime client secret for a single agent registration.
 *
 * This helper is Node-only and intended for `RemotePlayWorld.initAudio()` driven flows.
 */
export async function mintOpenAiRealtimeClientSecretForSdk(
  options: MintOptions
): Promise<RealtimeWebrtcClientSecret> {
  const apiKey = options.openai.apiKey?.trim() ?? "";
  if (apiKey.length === 0) {
    throw new Error("OPENAI_API_KEY is required when world.initAudio() is enabled");
  }
  const model = options.openai.model?.trim() || "gpt-realtime";
  const voice = options.openai.voice?.trim() || "marin";
  const instructions = resolveRealtimeInstructions(options);
  const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model,
        ...(instructions !== undefined && instructions.length > 0 ? { instructions } : {}),
        audio: { output: { voice } },
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`openai realtime client secret failed: ${res.status} ${text}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("openai realtime client secret failed: invalid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("openai realtime client secret failed: invalid payload");
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record.value !== "string" || record.value.length === 0) {
    throw new Error("openai realtime client secret failed: missing value");
  }
  const out: RealtimeWebrtcClientSecret = {
    clientSecret: record.value,
    model,
    voice,
  };
  if (typeof record.expires_at === "string" && record.expires_at.length > 0) {
    out.expiresAt = record.expires_at;
  }
  return out;
}
