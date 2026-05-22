/**
 * @module @agent-play/play-ui/preview-debug-joystick
 * preview debug joystick — preview canvas module (Pixi + DOM).
 */
import {
  formatPlayPadStickTransform,
  playPadStickVisualAtDirectionProgress,
  type PlayPadDirection,
  type PlayPadInput,
} from "./preview-play-pad-keys.js";

const STYLE_ID = "agent-play-preview-debug-joystick-styles";

const MAX_OFFSET_PX = 56;
const BASE_RADIUS_PX = 44;
const PLAY_PAD_SWEEP_DURATION_MS = 720;

export type JoystickVector = {
  x: number;
  y: number;
};

let vector: JoystickVector = { x: 0, y: 0 };

export function getJoystickVector(): JoystickVector {
  return vector;
}

export function setJoystickVectorZero(): void {
  vector = { x: 0, y: 0 };
}

export const JOYSTICK_DEFLECT_EPS = 0.02;

export function shouldClampWorldPositionWhenJoystickDriving(options: {
  playerId: string;
  primaryPlayerId: string | null;
  joystickActive: boolean;
}): boolean {
  const { playerId, primaryPlayerId, joystickActive } = options;
  if (primaryPlayerId === null) return true;
  if (playerId !== primaryPlayerId) return true;
  if (!joystickActive) return true;
  return false;
}

export function shouldClearPrimaryWaypointsWhileJoystickIdle(options: {
  joystickActive: boolean;
  joyVectorLength: number;
}): boolean {
  if (!options.joystickActive) return false;
  return options.joyVectorLength <= JOYSTICK_DEFLECT_EPS;
}

export { playPadStickVisualAtDirectionProgress } from "./preview-play-pad-keys.js";

export function screenDeltaToWorldJoystick(
  offsetXPx: number,
  offsetYPx: number,
  maxOffsetPx: number
): JoystickVector {
  const nx = offsetXPx / maxOffsetPx;
  const ny = offsetYPx / maxOffsetPx;
  const m = Math.hypot(nx, ny);
  if (m < JOYSTICK_DEFLECT_EPS) {
    return { x: 0, y: 0 };
  }
  const scale = m > 1 ? 1 / m : 1;
  return {
    x: nx * scale,
    y: -ny * scale,
  };
}

function ensureJoystickStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
.preview-debug-joystick {
  position: relative;
  flex-shrink: 0;
  width: ${BASE_RADIUS_PX * 2}px;
  height: ${BASE_RADIUS_PX * 2}px;
  z-index: 2;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
}
.preview-debug-joystick--hidden {
  display: none;
}
.preview-debug-joystick__base {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.45);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
}
.preview-debug-joystick__stick {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 36px;
  height: 36px;
  margin-left: -18px;
  margin-top: -18px;
  border-radius: 50%;
  background: rgba(241, 245, 249, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.6);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 2px 8px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  transform-origin: center center;
  transition: none;
}
.preview-debug-joystick--handle-detached .preview-debug-joystick__stick {
  opacity: 0;
  transform: translate(0, 0) scale(0.65);
}
.preview-debug-joystick--handle-attached .preview-debug-joystick__stick {
  opacity: 1;
}
.preview-debug-joystick__label {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 6px);
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 0.625rem;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.95);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}
`;
  document.head.append(s);
}

export type PreviewDebugJoystickHandle = {
  root: HTMLElement;
  setVisible: (visible: boolean) => void;
  handlePlayPadInput: (input: PlayPadInput) => boolean;
};

export function createPreviewDebugJoystick(options: {
  parent: HTMLElement;
}): PreviewDebugJoystickHandle {
  ensureJoystickStyles();

  const root = document.createElement("div");
  root.className =
    "preview-debug-joystick preview-debug-joystick--hidden preview-debug-joystick--handle-detached";
  root.setAttribute("role", "application");
  root.setAttribute("aria-label", "Move agent");

  const label = document.createElement("div");
  label.className = "preview-debug-joystick__label";
  label.textContent = "Play Pad";

  const base = document.createElement("div");
  base.className = "preview-debug-joystick__base";

  const stick = document.createElement("div");
  stick.className = "preview-debug-joystick__stick";

  root.append(label, base, stick);
  options.parent.appendChild(root);

  let active = false;
  let handleAttached = false;
  let sweepRafId: number | null = null;
  let originCX = 0;
  let originCY = 0;

  const cancelSweepAnimation = (): void => {
    if (sweepRafId !== null) {
      cancelAnimationFrame(sweepRafId);
      sweepRafId = null;
    }
  };

  const applyStickVisualFromDirection = (
    direction: PlayPadDirection,
    progress: number
  ): void => {
    const visual = playPadStickVisualAtDirectionProgress({
      direction,
      progress,
      maxOffsetPx: MAX_OFFSET_PX,
    });
    stick.style.transform = formatPlayPadStickTransform(visual);
    vector = screenDeltaToWorldJoystick(
      visual.offsetXPx,
      visual.offsetYPx,
      MAX_OFFSET_PX
    );
  };

  const applyStick = (clientX: number, clientY: number): void => {
    const dx = clientX - originCX;
    const dy = clientY - originCY;
    vector = screenDeltaToWorldJoystick(dx, dy, MAX_OFFSET_PX);
    const mag = Math.min(MAX_OFFSET_PX, Math.hypot(dx, dy));
    const ang = Math.atan2(dy, dx);
    const sx = Math.cos(ang) * mag;
    const sy = Math.sin(ang) * mag;
    stick.style.transform = `translate(${sx}px, ${sy}px) rotate(0deg)`;
  };

  const resetStick = (): void => {
    vector = { x: 0, y: 0 };
    stick.style.transform = formatPlayPadStickTransform({
      offsetXPx: 0,
      offsetYPx: 0,
      rotateDeg: 0,
    });
  };

  const setHandleAttached = (attached: boolean): void => {
    handleAttached = attached;
    root.classList.toggle("preview-debug-joystick--handle-attached", attached);
    root.classList.toggle("preview-debug-joystick--handle-detached", !attached);
    if (!attached) {
      cancelSweepAnimation();
      resetStick();
    }
  };

  const runDirectionSweep = (direction: PlayPadDirection): void => {
    cancelSweepAnimation();
    const startedAt = performance.now();
    const step = (now: number): void => {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / PLAY_PAD_SWEEP_DURATION_MS);
      applyStickVisualFromDirection(direction, progress);
      if (progress < 1) {
        sweepRafId = requestAnimationFrame(step);
        return;
      }
      sweepRafId = null;
    };
    sweepRafId = requestAnimationFrame(step);
  };

  const onPointerDown = (ev: PointerEvent): void => {
    ev.preventDefault();
    cancelSweepAnimation();
    setHandleAttached(true);
    active = true;
    root.setPointerCapture(ev.pointerId);
    const r = base.getBoundingClientRect();
    originCX = r.left + r.width / 2;
    originCY = r.top + r.height / 2;
    applyStick(ev.clientX, ev.clientY);
  };

  const onPointerMove = (ev: PointerEvent): void => {
    if (!active) return;
    ev.preventDefault();
    applyStick(ev.clientX, ev.clientY);
  };

  const onPointerUp = (ev: PointerEvent): void => {
    if (!active) return;
    active = false;
    try {
      root.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    resetStick();
  };

  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerup", onPointerUp);
  root.addEventListener("pointercancel", onPointerUp);
  root.addEventListener("lostpointercapture", () => {
    active = false;
    resetStick();
  });

  const setVisible = (visible: boolean): void => {
    root.classList.toggle("preview-debug-joystick--hidden", !visible);
    if (!visible) {
      active = false;
      setHandleAttached(false);
    }
  };

  const handlePlayPadInput = (input: PlayPadInput): boolean => {
    if (root.classList.contains("preview-debug-joystick--hidden")) {
      return false;
    }
    if (input.kind === "attach") {
      setHandleAttached(true);
      resetStick();
      return true;
    }
    if (!handleAttached) return false;
    runDirectionSweep(input.direction);
    return true;
  };

  return { root, setVisible, handlePlayPadInput };
}
