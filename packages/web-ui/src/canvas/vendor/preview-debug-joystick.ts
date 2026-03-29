const STYLE_ID = "agent-play-preview-debug-joystick-styles";

const MAX_OFFSET_PX = 56;
const BASE_RADIUS_PX = 44;

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
  background: rgba(15, 23, 42, 0.55);
  border: 2px solid rgba(148, 163, 184, 0.5);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
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
  background: rgba(226, 232, 240, 0.92);
  border: 2px solid rgba(71, 85, 105, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}
.preview-debug-joystick__label {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 6px);
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 10px;
  font-family: ui-sans-serif, system-ui, sans-serif;
  color: rgba(226, 232, 240, 0.95);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}
`;
  document.head.append(s);
}

export function createPreviewDebugJoystick(options: {
  parent: HTMLElement;
}): {
  root: HTMLElement;
  setVisible: (visible: boolean) => void;
} {
  ensureJoystickStyles();

  const root = document.createElement("div");
  root.className = "preview-debug-joystick preview-debug-joystick--hidden";
  root.setAttribute("role", "application");
  root.setAttribute("aria-label", "Move agent");

  const label = document.createElement("div");
  label.className = "preview-debug-joystick__label";
  label.textContent = "Agent joystick";

  const base = document.createElement("div");
  base.className = "preview-debug-joystick__base";

  const stick = document.createElement("div");
  stick.className = "preview-debug-joystick__stick";

  root.append(label, base, stick);
  options.parent.appendChild(root);

  let active = false;
  let originCX = 0;
  let originCY = 0;

  const applyStick = (clientX: number, clientY: number): void => {
    const dx = clientX - originCX;
    const dy = clientY - originCY;
    vector = screenDeltaToWorldJoystick(dx, dy, MAX_OFFSET_PX);
    const mag = Math.min(MAX_OFFSET_PX, Math.hypot(dx, dy));
    const ang = Math.atan2(dy, dx);
    const sx = Math.cos(ang) * mag;
    const sy = Math.sin(ang) * mag;
    stick.style.transform = `translate(${sx}px, ${sy}px)`;
  };

  const resetStick = (): void => {
    vector = { x: 0, y: 0 };
    stick.style.transform = "translate(0, 0)";
  };

  const onPointerDown = (ev: PointerEvent): void => {
    ev.preventDefault();
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
      resetStick();
    }
  };

  return { root, setVisible };
}
