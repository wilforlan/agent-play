import {
  buildAssistArgsFromInputs,
  resolveAssistFieldType,
} from "./preview-assist-coerce.js";

const ASSIST_STYLE_ID = "agent-play-preview-assist-ui-styles";

export type AssistToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

function ensureAssistStyles(): void {
  if (document.getElementById(ASSIST_STYLE_ID) !== null) return;
  const s = document.createElement("style");
  s.id = ASSIST_STYLE_ID;
  s.textContent = `
.preview-assist-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 4px 2px;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
}
.preview-assist-btn {
  font: 600 9px/1.2 system-ui, sans-serif;
  padding: 4px 7px;
  border-radius: 6px;
  border: 1px solid rgba(59, 130, 246, 0.45);
  background: rgba(239, 246, 255, 0.95);
  color: #1e3a8a;
  cursor: pointer;
}
.preview-assist-btn:hover:not(:disabled) {
  background: rgba(219, 234, 254, 0.98);
}
.preview-assist-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.preview-assist-form {
  display: none;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}
.preview-assist-form.preview-assist-form--open {
  display: flex;
}
.preview-assist-form label {
  font: 600 8px system-ui, sans-serif;
  color: #334155;
}
.preview-assist-form input:not([type="checkbox"]) {
  font: 9px system-ui, sans-serif;
  padding: 3px 5px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  width: 100%;
  box-sizing: border-box;
}
.preview-assist-form input[type="checkbox"] {
  width: auto;
  margin-left: 6px;
  vertical-align: middle;
}
.preview-assist-form button[type="submit"] {
  font: 600 9px system-ui, sans-serif;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #3b82f6;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
  align-self: flex-end;
}
.preview-assist-form button[type="submit"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.preview-assist-progress {
  display: none;
  height: 4px;
  margin: 2px 4px 4px;
  border-radius: 3px;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.35);
}
.preview-assist-progress.preview-assist-progress--on {
  display: block;
}
.preview-assist-progress__bar {
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, #3b82f6, #93c5fd, #3b82f6);
  background-size: 200% 100%;
  animation: preview-assist-marquee 1.1s linear infinite;
}
@keyframes preview-assist-marquee {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
`;
  document.head.append(s);
}

function capitalizeAssistLabel(toolName: string): string {
  const base = toolName.startsWith("assist_") ? toolName.slice(7) : toolName;
  return base
    .split("_")
    .filter((s) => s.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function parameterFieldKeys(parameters: Record<string, unknown>): string[] {
  return Object.keys(parameters).filter((k) => !k.startsWith("_"));
}

export function mountAssistPanel(options: {
  card: HTMLElement;
  agentId: string;
  getSid: () => string | null;
  apiBase: string;
  reloadSnapshot: () => void | Promise<void>;
}): {
  setTools: (tools: readonly AssistToolDef[]) => void;
  destroy: () => void;
} {
  ensureAssistStyles();
  const strip = document.createElement("div");
  strip.className = "preview-assist-strip";
  const formWrap = document.createElement("div");
  formWrap.className = "preview-assist-form";
  const progress = document.createElement("div");
  progress.className = "preview-assist-progress";
  progress.innerHTML =
    '<div class="preview-assist-progress__bar" aria-hidden="true"></div>';
  progress.setAttribute("aria-label", "Assist request in progress");
  options.card.appendChild(strip);
  options.card.appendChild(progress);
  options.card.appendChild(formWrap);

  const inputsByKey = new Map<string, HTMLInputElement>();
  let formTool: AssistToolDef | null = null;

  const setBusy = (busy: boolean): void => {
    strip.querySelectorAll("button").forEach((b) => {
      (b as HTMLButtonElement).disabled = busy;
    });
    formWrap.querySelectorAll("input,button").forEach((el) => {
      (el as HTMLInputElement | HTMLButtonElement).disabled = busy;
    });
    progress.classList.toggle("preview-assist-progress--on", busy);
  };

  const closeForm = (): void => {
    formTool = null;
    formWrap.classList.remove("preview-assist-form--open");
    formWrap.replaceChildren();
    inputsByKey.clear();
  };

  const submitAssist = async (toolName: string): Promise<void> => {
    const sid = options.getSid();
    if (sid === null) return;
    const tool = formTool;
    if (tool === null || tool.name !== toolName) {
      return;
    }
    const keys = parameterFieldKeys(tool.parameters);
    const args = buildAssistArgsFromInputs({
      parameters: tool.parameters,
      keys,
      getInput: (key) => inputsByKey.get(key),
    });
    setBusy(true);
    try {
      const url = `${options.apiBase}/api/agent-play/assist-tool?sid=${encodeURIComponent(sid)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetPlayerId: options.agentId,
          toolName,
          args,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t);
      }
      closeForm();
      await Promise.resolve(options.reloadSnapshot());
    } finally {
      setBusy(false);
    }
  };

  const openFormFor = (tool: AssistToolDef): void => {
    formTool = tool;
    formWrap.classList.add("preview-assist-form--open");
    formWrap.replaceChildren();
    inputsByKey.clear();
    const form = document.createElement("form");
    const keys = parameterFieldKeys(tool.parameters);
    for (const key of keys) {
      const lab = document.createElement("label");
      lab.textContent = key;
      const meta = tool.parameters[key];
      const fieldType = resolveAssistFieldType(meta);
      if (fieldType === "boolean") {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = key;
        input.autocomplete = "off";
        lab.appendChild(input);
        form.appendChild(lab);
        inputsByKey.set(key, input);
        continue;
      }
      const input = document.createElement("input");
      input.type = fieldType === "number" ? "number" : "text";
      if (fieldType === "number") {
        input.step = "any";
      }
      input.name = key;
      input.autocomplete = "off";
      lab.appendChild(input);
      form.appendChild(lab);
      inputsByKey.set(key, input);
    }
    const send = document.createElement("button");
    send.type = "submit";
    send.textContent = "Send";
    form.appendChild(send);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      void submitAssist(tool.name);
    });
    formWrap.appendChild(form);
  };

  const setTools = (tools: readonly AssistToolDef[]): void => {
    strip.replaceChildren();
    closeForm();
    for (const t of tools) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preview-assist-btn";
      btn.title = t.description.length > 0 ? t.description : t.name;
      btn.textContent = capitalizeAssistLabel(t.name);
      btn.addEventListener("click", () => {
        openFormFor(t);
      });
      strip.appendChild(btn);
    }
  };

  return {
    setTools,
    destroy: () => {
      strip.remove();
      formWrap.remove();
      progress.remove();
    },
  };
}
