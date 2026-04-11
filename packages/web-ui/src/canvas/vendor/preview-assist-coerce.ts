/**
 * @module @agent-play/play-ui/preview-assist-coerce
 * preview assist coerce — preview canvas module (Pixi + DOM).
 */
export type AssistToolFieldType = "string" | "number" | "boolean";

export function resolveAssistFieldType(metadata: unknown): AssistToolFieldType {
  if (metadata !== null && typeof metadata === "object") {
    const m = metadata as { fieldType?: unknown; type?: unknown };
    if (
      m.fieldType === "string" ||
      m.fieldType === "number" ||
      m.fieldType === "boolean"
    ) {
      return m.fieldType;
    }
    if (m.type === "string" || m.type === "number" || m.type === "boolean") {
      return m.type;
    }
  }
  return "string";
}

export function coerceAssistFieldValue(options: {
  fieldType: AssistToolFieldType;
  raw: string;
  checked?: boolean;
}): unknown | undefined {
  const { fieldType, raw, checked } = options;
  if (fieldType === "boolean") {
    if (checked !== undefined) {
      return checked;
    }
    const t = raw.trim().toLowerCase();
    if (t === "") {
      return undefined;
    }
    if (t === "true" || t === "1" || t === "yes") {
      return true;
    }
    if (t === "false" || t === "0" || t === "no") {
      return false;
    }
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return undefined;
  }
  if (fieldType === "number") {
    const n = Number(trimmed);
    if (Number.isNaN(n)) {
      return undefined;
    }
    return n;
  }
  return trimmed;
}

export function buildAssistArgsFromInputs(options: {
  parameters: Record<string, unknown>;
  keys: readonly string[];
  getInput: (key: string) => HTMLInputElement | undefined;
}): Record<string, unknown> {
  const { parameters, keys, getInput } = options;
  const args: Record<string, unknown> = {};
  for (const key of keys) {
    const meta = parameters[key];
    const fieldType = resolveAssistFieldType(meta);
    const inputEl = getInput(key);
    if (inputEl === undefined) {
      continue;
    }
    if (fieldType === "boolean" && inputEl.type === "checkbox") {
      args[key] = inputEl.checked;
      continue;
    }
    const value = coerceAssistFieldValue({
      fieldType,
      raw: inputEl.value,
    });
    if (value !== undefined) {
      args[key] = value;
    }
  }
  return args;
}
