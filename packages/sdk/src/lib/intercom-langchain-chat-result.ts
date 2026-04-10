function contentToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") {
          return block;
        }
        if (typeof block === "object" && block !== null && "text" in block) {
          const t = (block as { text?: unknown }).text;
          return typeof t === "string" ? t : "";
        }
        return "";
      })
      .join("");
  }
  if (content !== null && typeof content === "object" && "text" in content) {
    const t = (content as { text?: unknown }).text;
    return typeof t === "string" ? t : JSON.stringify(content);
  }
  return JSON.stringify(content);
}

/**
 * Maps a LangChain agent **`invoke`** result to a plain object suitable for **`intercomResponse`** **`result`**.
 */
export function intercomResultRecordFromLangChainInvokeOutput(
  output: unknown
): Record<string, unknown> {
  if (output === null || typeof output !== "object") {
    return { mode: "chat", message: String(output) };
  }
  const o = output as Record<string, unknown>;
  if ("structuredResponse" in o && o.structuredResponse !== undefined) {
    const sr = o.structuredResponse;
    if (sr !== null && typeof sr === "object" && !Array.isArray(sr)) {
      return { ...sr };
    }
    return { mode: "chat", structuredResponse: sr };
  }
  const messages = o.messages;
  if (Array.isArray(messages) && messages.length > 0) {
    const last = messages[messages.length - 1];
    if (last !== null && typeof last === "object" && "content" in last) {
      const text = contentToText((last as { content: unknown }).content);
      if (text.trim().length > 0) {
        return { mode: "chat", message: text };
      }
    }
  }
  return { mode: "chat", output: o };
}
