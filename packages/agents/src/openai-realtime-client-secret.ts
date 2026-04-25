export type MintOpenAiRealtimeClientSecretOptions = {
  apiKey: string;
  model?: string;
  voice?: string;
  instructions?: string;
  agentName?: string;
};

export type MintedOpenAiRealtimeClientSecret = {
  clientSecret: string;
  expiresAt?: string;
  model: string;
  voice: string;
};

const DEFAULT_REALTIME_MODEL = "gpt-realtime";
const DEFAULT_REALTIME_VOICE = "marin";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveRealtimeInstructions(
  options: MintOpenAiRealtimeClientSecretOptions
): string | undefined {
  const explicit = options.instructions?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    return explicit;
  }
  const agentName = options.agentName?.trim();
  if (agentName !== undefined && agentName.length > 0) {
    return [
      `You are ${agentName}.`,
      "You are speaking with a human in real-time voice mode on agent-play.com.",
      "Keep responses short, clear, and conversational unless asked for detail.",
    ].join(" ");
  }
  return undefined;
}

export async function mintOpenAiRealtimeClientSecret(
  options: MintOpenAiRealtimeClientSecretOptions
): Promise<MintedOpenAiRealtimeClientSecret> {
  const apiKey = options.apiKey.trim();
  if (apiKey.length === 0) {
    throw new Error("OPENAI_API_KEY is required for realtime client secret minting");
  }
  const model = options.model?.trim() || DEFAULT_REALTIME_MODEL;
  const voice = options.voice?.trim() || DEFAULT_REALTIME_VOICE;
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
        ...(instructions !== undefined ? { instructions } : {}),
        audio: {
          output: {
            voice,
          },
        },
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`openai realtime client secret failed: ${res.status} ${text}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error("openai realtime client secret failed: invalid JSON");
  }
  if (!isRecord(json) || typeof json.value !== "string" || json.value.length === 0) {
    throw new Error("openai realtime client secret failed: missing value");
  }
  const parsed: MintedOpenAiRealtimeClientSecret = {
    clientSecret: json.value,
    model,
    voice,
  };
  if (typeof json.expires_at === "string" && json.expires_at.length > 0) {
    parsed.expiresAt = json.expires_at;
  }
  return parsed;
}
