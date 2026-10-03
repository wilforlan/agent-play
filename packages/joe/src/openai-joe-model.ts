import type { JoeModel } from "./joe-model.js";

export type CreateOpenAiJoeModelOptions = {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
};

export const createOpenAiJoeModel = (
  options: CreateOpenAiJoeModelOptions
): JoeModel => {
  const model = options.model ?? "gpt-4o-mini";
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(
    /\/$/,
    ""
  );

  return {
    complete: async (input) => {
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: input.system },
            ...input.messages.map((m) => ({
              role: m.role === "system" ? "user" : m.role,
              content: m.content,
            })),
          ],
        }),
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(
          `Joe OpenAI error ${String(response.status)}: ${errText.slice(0, 200)}`
        );
      }
      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const content = json.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim().length === 0) {
        throw new Error("Joe OpenAI returned empty content");
      }
      return content;
    },
  };
};
