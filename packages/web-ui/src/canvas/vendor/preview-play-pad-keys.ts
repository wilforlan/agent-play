/**
 * @module @agent-play/play-ui/preview-play-pad-keys
 * Play Pad keyboard bindings and interaction-panel help copy.
 */

export type PlayPadDirection =
  | "left"
  | "right"
  | "up"
  | "down"
  | "downLeft"
  | "downRight"
  | "upRight"
  | "upLeft";

export type PlayPadInput =
  | { kind: "attach" }
  | { kind: "direction"; direction: PlayPadDirection };

const PLAY_PAD_COMBO_DIRECTION: Readonly<Record<string, PlayPadDirection>> = {
  mk: "downLeft",
  km: "downLeft",
  lm: "downRight",
  ml: "downRight",
  il: "upRight",
  li: "upRight",
  ik: "upLeft",
  ki: "upLeft",
};

const PLAY_PAD_SINGLE_INPUT: Readonly<
  Record<string, PlayPadInput>
> = {
  n: { kind: "attach" },
  k: { kind: "direction", direction: "left" },
  l: { kind: "direction", direction: "right" },
  m: { kind: "direction", direction: "down" },
  i: { kind: "direction", direction: "up" },
};

export const PLAY_PAD_SEQUENCE_WINDOW_MS = 220;

export const PLAY_PAD_KEY_CHARS = new Set([
  "n",
  "k",
  "l",
  "m",
  "i",
]);

export function isPlayPadKeyChar(char: string): boolean {
  return PLAY_PAD_KEY_CHARS.has(char);
}

export function isPlayPadTwoLetterCombo(buffer: string): boolean {
  return buffer.length === 2 && PLAY_PAD_COMBO_DIRECTION[buffer] !== undefined;
}

export function resolvePlayPadInputFromKeyBuffer(
  buffer: string
): PlayPadInput | null {
  if (buffer.length >= 2) {
    const combo = buffer.slice(-2);
    const direction = PLAY_PAD_COMBO_DIRECTION[combo];
    if (direction !== undefined) {
      return { kind: "direction", direction };
    }
  }
  if (buffer.length === 1) {
    return PLAY_PAD_SINGLE_INPUT[buffer] ?? null;
  }
  return null;
}

export type PlayPadStickVisual = {
  offsetXPx: number;
  offsetYPx: number;
  rotateDeg: number;
};

type PlayPadDirectionSpec = {
  startRotateDeg: number;
  sweepRotateDeg: number;
  endOffsetXRatio: number;
  endOffsetYRatio: number;
};

const PLAY_PAD_DIRECTION_SPEC: Readonly<
  Record<PlayPadDirection, PlayPadDirectionSpec>
> = {
  left: {
    startRotateDeg: -90,
    sweepRotateDeg: -360,
    endOffsetXRatio: -1,
    endOffsetYRatio: 0,
  },
  right: {
    startRotateDeg: 90,
    sweepRotateDeg: 360,
    endOffsetXRatio: 1,
    endOffsetYRatio: 0,
  },
  up: {
    startRotateDeg: -90,
    sweepRotateDeg: -360,
    endOffsetXRatio: 0,
    endOffsetYRatio: -1,
  },
  down: {
    startRotateDeg: 90,
    sweepRotateDeg: 360,
    endOffsetXRatio: 0,
    endOffsetYRatio: 1,
  },
  downLeft: {
    startRotateDeg: 135,
    sweepRotateDeg: 360,
    endOffsetXRatio: -1,
    endOffsetYRatio: 1,
  },
  downRight: {
    startRotateDeg: 45,
    sweepRotateDeg: 360,
    endOffsetXRatio: 1,
    endOffsetYRatio: 1,
  },
  upRight: {
    startRotateDeg: -45,
    sweepRotateDeg: -360,
    endOffsetXRatio: 1,
    endOffsetYRatio: -1,
  },
  upLeft: {
    startRotateDeg: -135,
    sweepRotateDeg: -360,
    endOffsetXRatio: -1,
    endOffsetYRatio: -1,
  },
};

const diagonalScale = 1 / Math.SQRT2;

export function playPadStickVisualAtDirectionProgress(options: {
  direction: PlayPadDirection;
  progress: number;
  maxOffsetPx: number;
}): PlayPadStickVisual {
  const t = Math.min(1, Math.max(0, options.progress));
  const spec = PLAY_PAD_DIRECTION_SPEC[options.direction];
  const endX = spec.endOffsetXRatio * options.maxOffsetPx;
  const endY = spec.endOffsetYRatio * options.maxOffsetPx;
  const useDiagonal =
    spec.endOffsetXRatio !== 0 && spec.endOffsetYRatio !== 0;
  const scale = useDiagonal ? diagonalScale : 1;
  return {
    offsetXPx: t === 0 ? 0 : endX * scale * t,
    offsetYPx: t === 0 ? 0 : endY * scale * t,
    rotateDeg: spec.startRotateDeg + spec.sweepRotateDeg * t,
  };
}

export function formatPlayPadStickTransform(visual: PlayPadStickVisual): string {
  return `translate(${visual.offsetXPx}px, ${visual.offsetYPx}px) rotate(${visual.rotateDeg}deg)`;
}

export type PlayPadHelpRow = {
  keys: string;
  description: string;
};

export const PLAY_PAD_HELP_ROWS: readonly PlayPadHelpRow[] = [
  { keys: "N", description: "Attach the Play Pad handle" },
  { keys: "K", description: "Move left (rotating sweep)" },
  { keys: "L", description: "Move right (rotating sweep)" },
  { keys: "I", description: "Move up" },
  { keys: "M", description: "Move down" },
  { keys: "MK or KM", description: "Move diagonal down-left" },
  { keys: "LM or ML", description: "Move diagonal down-right" },
  { keys: "IL or LI", description: "Move diagonal up-right" },
  { keys: "IK or KI", description: "Move diagonal up-left" },
];

const PLAY_PAD_HELP_STYLE_ID = "agent-play-preview-play-pad-help-styles";

function ensurePlayPadHelpStyles(): void {
  if (document.getElementById(PLAY_PAD_HELP_STYLE_ID) !== null) return;
  const s = document.createElement("style");
  s.id = PLAY_PAD_HELP_STYLE_ID;
  s.textContent = `
.preview-session-interaction__play-pad-help {
  margin-bottom: 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(30, 41, 59, 0.55);
  overflow: hidden;
}
.preview-session-interaction__play-pad-help-summary {
  list-style: none;
  cursor: pointer;
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 700;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.preview-session-interaction__play-pad-help-summary::-webkit-details-marker {
  display: none;
}
.preview-session-interaction__play-pad-help-summary::after {
  content: "▾";
  font-size: 10px;
  color: #94a3b8;
  transition: transform 0.15s ease;
}
.preview-session-interaction__play-pad-help[open] .preview-session-interaction__play-pad-help-summary::after {
  transform: rotate(180deg);
}
.preview-session-interaction__play-pad-help-body {
  padding: 0 10px 10px;
  display: grid;
  gap: 6px;
}
.preview-session-interaction__play-pad-help-row {
  display: grid;
  grid-template-columns: minmax(72px, auto) 1fr;
  gap: 8px;
  font-size: 11px;
  line-height: 1.35;
}
.preview-session-interaction__play-pad-help-keys {
  font-weight: 700;
  color: #93c5fd;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.preview-session-interaction__play-pad-help-desc {
  color: #cbd5e1;
}
.preview-session-interaction__play-pad-help-note {
  font-size: 10px;
  color: #94a3b8;
  margin: 0;
}
`;
  document.head.append(s);
}

export function createPlayPadKeysHelpSection(): HTMLElement {
  ensurePlayPadHelpStyles();
  const details = document.createElement("details");
  details.className = "preview-session-interaction__play-pad-help";
  const summary = document.createElement("summary");
  summary.className = "preview-session-interaction__play-pad-help-summary";
  summary.textContent = "Play Pad keyboard controls";
  const body = document.createElement("div");
  body.className = "preview-session-interaction__play-pad-help-body";
  const note = document.createElement("p");
  note.className = "preview-session-interaction__play-pad-help-note";
  note.textContent =
    "Requires joystick enabled. Press two-letter diagonals in quick succession (either order).";
  body.append(note);
  for (const row of PLAY_PAD_HELP_ROWS) {
    const rowEl = document.createElement("div");
    rowEl.className = "preview-session-interaction__play-pad-help-row";
    const keys = document.createElement("span");
    keys.className = "preview-session-interaction__play-pad-help-keys";
    keys.textContent = row.keys;
    const desc = document.createElement("span");
    desc.className = "preview-session-interaction__play-pad-help-desc";
    desc.textContent = row.description;
    rowEl.append(keys, desc);
    body.append(rowEl);
  }
  details.append(summary, body);
  return details;
}
