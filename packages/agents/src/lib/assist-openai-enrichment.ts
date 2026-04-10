const OPENAI_CHAT_COMPLETIONS_URL =
  "https://api.openai.com/v1/chat/completions";

function stripUnsafeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\bon\w+\s*=/gi, "data-blocked=");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fallbackFromStructured(structured: Record<string, unknown>): {
  messageHtml: string;
  plainSummary: string;
} {
  const summary =
    typeof structured.summary === "string"
      ? structured.summary
      : JSON.stringify(structured);
  const json = JSON.stringify(structured, null, 2);
  const messageHtml = `<article class="assist-html-root"><p>${escapeHtml(summary)}</p><pre class="assist-json-fallback">${escapeHtml(json)}</pre></article>`;
  return { messageHtml, plainSummary: summary };
}

type OpenAiJsonAssistResponse = {
  html?: string;
  plainSummary?: string;
};

/**
 * Calls OpenAI Chat Completions with JSON output when `OPENAI_API_KEY` is set;
 * otherwise returns HTML + summary derived from the structured payload only.
 */
export async function enrichAssistOutputWithOpenAI(options: {
  toolLabel: string;
  systemPrompt: string;
  structured: Record<string, unknown>;
}): Promise<{ messageHtml: string; plainSummary: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  const model =
    process.env.OPENAI_ASSIST_MODEL?.trim() || "gpt-4o-mini";
  if (key === undefined || key.length === 0) {
    return fallbackFromStructured(options.structured);
  }
  const userPayload = JSON.stringify(options.structured, null, 2);
  const res = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: options.systemPrompt },
        {
          role: "user",
          content: [
            `Tool: ${options.toolLabel}`,
            "",
            "Validated inputs and computed structured result (JSON):",
            userPayload,
            "",
            'Respond with JSON only, shape: { "html": string, "plainSummary": string }.',
            "The html field must be a single HTML fragment (no DOCTYPE) using semantic tags (article, section, h3, p, ul, li, table when helpful).",
            "Include a short plainSummary string (one or two sentences) for notifications.",
            "Do not include script tags or inline event handlers.",
          ].join("\n"),
        },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI assist completion failed: ${res.status} ${t}`);
  }
  const raw = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = raw.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    return fallbackFromStructured(options.structured);
  }
  let parsed: OpenAiJsonAssistResponse;
  try {
    parsed = JSON.parse(content) as OpenAiJsonAssistResponse;
  } catch {
    return fallbackFromStructured(options.structured);
  }
  const htmlRaw = typeof parsed.html === "string" ? parsed.html : "";
  const plainSummary =
    typeof parsed.plainSummary === "string" && parsed.plainSummary.trim().length > 0
      ? parsed.plainSummary.trim()
      : typeof options.structured.summary === "string"
        ? options.structured.summary
        : JSON.stringify(options.structured);
  const messageHtml =
    htmlRaw.trim().length > 0
      ? `<article class="assist-html-root">${stripUnsafeHtml(htmlRaw)}</article>`
      : fallbackFromStructured(options.structured).messageHtml;
  return { messageHtml, plainSummary };
}
