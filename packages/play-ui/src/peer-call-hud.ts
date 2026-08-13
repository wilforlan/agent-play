import { formatCallDurationHhMmSs } from "./format-call-duration.js";

export type PeerCallHudHandle = {
  readonly root: HTMLElement;
  setPeerName(name: string): void;
  setElapsedSeconds(seconds: number): void;
  setVisible(visible: boolean): void;
  destroy(): void;
};

const STYLE_ID = "preview-peer-call-hud-styles";

const ensureStyles = (): void => {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById(STYLE_ID) !== null) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.preview-peer-call-hud {
  position: absolute;
  left: 50%;
  bottom: 92px;
  transform: translateX(-50%);
  z-index: 12050;
  display: none;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.92);
  color: #e2e8f0;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  pointer-events: none;
}
.preview-peer-call-hud--visible {
  display: flex;
}
.preview-peer-call-hud__name {
  font-weight: 700;
  color: #f8fafc;
}
.preview-peer-call-hud__timer {
  font-variant-numeric: tabular-nums;
  color: #94a3b8;
}
`;
  document.head.appendChild(style);
};

export const createPeerCallHud = (options: {
  parent: HTMLElement;
}): PeerCallHudHandle => {
  ensureStyles();
  const root = document.createElement("div");
  root.className = "preview-peer-call-hud";
  root.setAttribute("aria-live", "polite");
  const nameEl = document.createElement("span");
  nameEl.className = "preview-peer-call-hud__name";
  nameEl.textContent = "Peer";
  const timerEl = document.createElement("span");
  timerEl.className = "preview-peer-call-hud__timer";
  timerEl.textContent = formatCallDurationHhMmSs(0);
  root.append(nameEl, timerEl);
  options.parent.appendChild(root);

  return {
    root,
    setPeerName(name) {
      const trimmed = name.trim();
      nameEl.textContent = trimmed.length > 0 ? trimmed : "Peer";
    },
    setElapsedSeconds(seconds) {
      timerEl.textContent = formatCallDurationHhMmSs(seconds);
    },
    setVisible(visible) {
      root.classList.toggle("preview-peer-call-hud--visible", visible);
    },
    destroy() {
      root.remove();
    },
  };
};
