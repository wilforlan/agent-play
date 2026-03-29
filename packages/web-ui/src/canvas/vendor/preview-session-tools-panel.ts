import {
  getPreviewSessionIdSync,
  persistPreviewSessionId,
} from "./preview-session-id.js";

const STYLE_ID = "agent-play-preview-session-tools-styles";

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
.preview-session-tools-wrap {
  position: relative;
  z-index: auto;
}
.preview-session-tools-toggle {
  pointer-events: auto;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.92);
  color: #e2e8f0;
  cursor: pointer;
  font-size: 12px;
}
.preview-session-tools-toggle:hover {
  background: rgba(30, 41, 59, 0.95);
}
.preview-session-tools-toggle--open {
  border-color: rgba(96, 165, 250, 0.55);
}
.preview-session-tools-panel {
  display: none;
  margin-top: 8px;
  padding: 12px;
  width: 260px;
  max-width: calc(100vw - 24px);
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.96);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
.preview-session-tools-panel--open {
  display: block;
}
.preview-session-tools-row {
  margin-bottom: 10px;
}
.preview-session-tools-row:last-child {
  margin-bottom: 0;
}
.preview-session-tools-label {
  display: block;
  margin-bottom: 4px;
  color: #94a3b8;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.preview-session-tools-sid {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: #cbd5e1;
  word-break: break-all;
  line-height: 1.4;
}
.preview-session-tools-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.preview-session-tools-actions button {
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(30, 41, 59, 0.95);
  color: #e2e8f0;
  font-size: 12px;
  cursor: pointer;
}
.preview-session-tools-actions button:hover {
  background: rgba(51, 65, 85, 0.95);
}
.preview-session-tools-actions button[data-danger="1"] {
  border-color: rgba(248, 113, 113, 0.5);
  color: #fecaca;
}
.preview-session-tools-actions button[data-danger="1"]:hover {
  background: rgba(127, 29, 29, 0.35);
}
.preview-session-tools-msg {
  margin-top: 8px;
  font-size: 11px;
  color: #f87171;
  line-height: 1.35;
}
.preview-session-tools-msg--ok {
  color: #86efac;
}
`;
  document.head.append(s);
}

export function createPreviewSessionToolsPanel(): HTMLElement {
  ensureStyles();
  const wrap = document.createElement("div");
  wrap.className =
    "preview-chat-settings-wrap preview-chat-settings-wrap--toolbar preview-session-tools-wrap";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "preview-session-tools-toggle";
  toggle.textContent = "Sessions";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-haspopup", "dialog");

  const panel = document.createElement("div");
  panel.className = "preview-session-tools-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Session management");

  const sidRow = document.createElement("div");
  sidRow.className = "preview-session-tools-row";
  const sidLabel = document.createElement("span");
  sidLabel.className = "preview-session-tools-label";
  sidLabel.textContent = "Session id";
  const sidEl = document.createElement("div");
  sidEl.className = "preview-session-tools-sid";
  sidRow.append(sidLabel, sidEl);

  const actions = document.createElement("div");
  actions.className = "preview-session-tools-actions";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.textContent = "Copy";

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.textContent = "Reset session";
  resetBtn.setAttribute("data-danger", "1");

  const msgEl = document.createElement("div");
  msgEl.className = "preview-session-tools-msg";
  msgEl.style.display = "none";

  actions.append(copyBtn, resetBtn);
  panel.append(sidRow, actions, msgEl);

  const syncSid = (): void => {
    const sid = getPreviewSessionIdSync();
    sidEl.textContent = sid ?? "(none)";
    copyBtn.disabled = sid === null;
    resetBtn.disabled = sid === null;
  };

  const setMsg = (text: string, ok: boolean): void => {
    if (text.length === 0) {
      msgEl.style.display = "none";
      msgEl.textContent = "";
      msgEl.classList.remove("preview-session-tools-msg--ok");
      return;
    }
    msgEl.style.display = "block";
    msgEl.textContent = text;
    if (ok) {
      msgEl.classList.add("preview-session-tools-msg--ok");
    } else {
      msgEl.classList.remove("preview-session-tools-msg--ok");
    }
  };

  copyBtn.addEventListener("click", () => {
    const sid = getPreviewSessionIdSync();
    if (sid === null) return;
    void navigator.clipboard.writeText(sid).then(
      () => {
        setMsg("Copied", true);
      },
      () => {
        setMsg("Copy failed", false);
      }
    );
  });

  resetBtn.addEventListener("click", () => {
    const sid = getPreviewSessionIdSync();
    if (sid === null) return;
    if (
      !window.confirm(
        "Reset the server session? This clears agents and world state, then reloads the page."
      )
    ) {
      return;
    }
    setMsg("", false);
    resetBtn.disabled = true;
    void fetch(
      `/api/agent-play/session/reset?sid=${encodeURIComponent(sid)}`,
      { method: "POST" }
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "reset failed");
        }
        return res.json() as Promise<{ sid: string }>;
      })
      .then((json) => {
        persistPreviewSessionId(json.sid);
        location.reload();
      })
      .catch((err: unknown) => {
        const m = err instanceof Error ? err.message : String(err);
        setMsg(m, false);
        resetBtn.disabled = false;
      });
  });

  toggle.addEventListener("click", () => {
    const open = panel.classList.toggle("preview-session-tools-panel--open");
    toggle.classList.toggle("preview-session-tools-toggle--open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      syncSid();
      setMsg("", false);
    }
  });

  syncSid();
  wrap.append(toggle, panel);
  return wrap;
}
