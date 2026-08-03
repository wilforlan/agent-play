/**
 * @module @agent-play/play-ui/arrival-quest
 * First-run Arrival Quest progress + coach toast for Agent Play World.
 */

export const ARRIVAL_QUEST_STORAGE_KEY = "agent-play:arrival-quest:v2";

export type ArrivalQuestStep =
  | "watch_screen"
  | "touch_control"
  | "play_pad"
  | "wallet_chip"
  | "meet_agent"
  | "maple_arcade"
  | "complete";

export type ArrivalQuestProgress = {
  readonly step: ArrivalQuestStep;
  readonly guest: boolean;
  readonly coachDismissed: boolean;
  readonly citizenCardDismissed: boolean;
};

const STEP_ORDER: readonly ArrivalQuestStep[] = [
  "watch_screen",
  "touch_control",
  "play_pad",
  "wallet_chip",
  "meet_agent",
  "maple_arcade",
  "complete",
];

const COACH_COPY: Readonly<
  Record<Exclude<ArrivalQuestStep, "complete">, { title: string; body: string }>
> = {
  watch_screen: {
    title: "Watch screen",
    body: "This live map is your watch screen — St. John St., Peterson St., and Maple Ave. share one world.",
  },
  touch_control: {
    title: "Touch controls",
    body: "Top pad: A assist, C chat, P act, W wallet. Tap a key when you’re near something.",
  },
  play_pad: {
    title: "Play pad",
    body: "Use the joystick (or arrow keys) to walk the city. Move a little to continue.",
  },
  wallet_chip: {
    title: "Wallet chip",
    body: "Bottom-left chip shows APW$ and APU. Tap it to open your inventory.",
  },
  meet_agent: {
    title: "St. John St.",
    body: "Stand near an agent — press A to assist or C to chat.",
  },
  maple_arcade: {
    title: "Maple Ave",
    body: "Play a cabinet to earn APU.",
  },
};

const GUEST_MEET_COPY = {
  title: "St. John St.",
  body: "Agents live here. Claim your place to chat and assist.",
} as const;

export const isGuestNodeId = (nodeId: string): boolean => {
  const id = nodeId.trim();
  return id === "preview-local-node" || id.startsWith("session-");
};

const isArrivalQuestStep = (value: unknown): value is ArrivalQuestStep =>
  value === "watch_screen" ||
  value === "touch_control" ||
  value === "play_pad" ||
  value === "wallet_chip" ||
  value === "meet_agent" ||
  value === "maple_arcade" ||
  value === "complete";

export const readArrivalQuestProgress = (): ArrivalQuestProgress | null => {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(ARRIVAL_QUEST_STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const step = (parsed as { step?: unknown }).step;
    const guest = (parsed as { guest?: unknown }).guest;
    const coachDismissed = (parsed as { coachDismissed?: unknown })
      .coachDismissed;
    const citizenCardDismissed = (parsed as { citizenCardDismissed?: unknown })
      .citizenCardDismissed;
    if (!isArrivalQuestStep(step) || typeof guest !== "boolean") {
      return null;
    }
    return {
      step,
      guest,
      coachDismissed: coachDismissed === true,
      citizenCardDismissed: citizenCardDismissed === true,
    };
  } catch {
    return null;
  }
};

const writeProgress = (progress: ArrivalQuestProgress): void => {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(ARRIVAL_QUEST_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    return;
  }
};

export const clearArrivalQuestProgress = (): void => {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(ARRIVAL_QUEST_STORAGE_KEY);
    localStorage.removeItem("agent-play:arrival-quest:v1");
  } catch {
    return;
  }
};

export const startArrivalQuest = (options: {
  readonly guest: boolean;
}): ArrivalQuestProgress => {
  const existing = readArrivalQuestProgress();
  if (existing !== null && existing.step === "complete") {
    return existing;
  }
  if (existing !== null && existing.step !== "complete") {
    return existing;
  }
  const progress: ArrivalQuestProgress = {
    step: "watch_screen",
    guest: options.guest,
    coachDismissed: false,
    citizenCardDismissed: false,
  };
  writeProgress(progress);
  return progress;
};

export const isArrivalQuestActive = (): boolean => {
  const progress = readArrivalQuestProgress();
  return progress !== null && progress.step !== "complete";
};

export const markArrivalQuestStep = (step: ArrivalQuestStep): boolean => {
  const progress = readArrivalQuestProgress();
  if (progress === null || progress.step === "complete") {
    return false;
  }
  if (step === "complete" || progress.step !== step) {
    return false;
  }
  const currentIndex = STEP_ORDER.indexOf(progress.step);
  const next = STEP_ORDER[currentIndex + 1];
  if (next === undefined) {
    return false;
  }
  writeProgress({
    ...progress,
    step: next,
  });
  return true;
};

export const advanceArrivalQuestStep = (): boolean => {
  const progress = readArrivalQuestProgress();
  if (progress === null || progress.step === "complete") {
    return false;
  }
  return markArrivalQuestStep(progress.step);
};

export const dismissArrivalQuestCoach = (): void => {
  const progress = readArrivalQuestProgress();
  if (progress === null) {
    return;
  }
  writeProgress({ ...progress, coachDismissed: true });
};

export const dismissCitizenCard = (): void => {
  const progress = readArrivalQuestProgress();
  if (progress === null) {
    return;
  }
  writeProgress({ ...progress, citizenCardDismissed: true });
};

export const shouldShowCitizenCard = (): boolean => {
  const progress = readArrivalQuestProgress();
  if (progress === null) {
    return false;
  }
  return (
    progress.step === "complete" &&
    !progress.guest &&
    !progress.citizenCardDismissed
  );
};

export const getArrivalQuestCoachCopy = (
  progress: ArrivalQuestProgress
): { title: string; body: string } | null => {
  if (progress.step === "complete" || progress.coachDismissed) {
    return null;
  }
  if (progress.step === "meet_agent" && progress.guest) {
    return { ...GUEST_MEET_COPY };
  }
  return { ...COACH_COPY[progress.step] };
};

const COACH_STYLE_ID = "agent-play-arrival-quest-coach-styles";
const COACH_ROOT_CLASS = "arrival-quest-coach";

const ensureCoachStyles = (): void => {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById(COACH_STYLE_ID) !== null) {
    return;
  }
  const style = document.createElement("style");
  style.id = COACH_STYLE_ID;
  style.textContent = `
.${COACH_ROOT_CLASS} {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: max(72px, calc(58px + env(safe-area-inset-top, 0px)));
  width: min(360px, calc(100vw - 24px));
  z-index: 14000;
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(250, 248, 242, 0.96);
  color: #1e293b;
  border: 1px solid rgba(94, 124, 110, 0.35);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
  font-family: ui-sans-serif, system-ui, sans-serif;
  pointer-events: auto;
}
.${COACH_ROOT_CLASS}[hidden] {
  display: none !important;
}
.${COACH_ROOT_CLASS}__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.${COACH_ROOT_CLASS}__body {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: #334155;
}
.${COACH_ROOT_CLASS}__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 4px;
}
.${COACH_ROOT_CLASS}__next,
.${COACH_ROOT_CLASS}__dismiss {
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  touch-action: manipulation;
  pointer-events: auto;
}
.${COACH_ROOT_CLASS}__next {
  border: 1px solid rgba(45, 122, 110, 0.55);
  background: rgba(45, 122, 110, 0.92);
  color: #fff;
}
.${COACH_ROOT_CLASS}__dismiss {
  border: 1px solid rgba(94, 124, 110, 0.35);
  background: transparent;
  color: #475569;
}
.${COACH_ROOT_CLASS}__dismiss:hover {
  color: #0f172a;
}
@media (max-width: 480px) {
  .${COACH_ROOT_CLASS}__actions {
    flex-direction: column;
    align-items: stretch;
  }
  .${COACH_ROOT_CLASS}__next,
  .${COACH_ROOT_CLASS}__dismiss {
    width: 100%;
  }
}
`;
  document.head.append(style);
};

export type ArrivalQuestCoachHandle = {
  sync(): void;
  destroy(): void;
};

export type CreateArrivalQuestCoachOptions = {
  readonly parent?: HTMLElement;
};

export const createArrivalQuestCoach = (
  options: CreateArrivalQuestCoachOptions = {}
): ArrivalQuestCoachHandle => {
  ensureCoachStyles();
  const parent = options.parent ?? document.body;
  const root = document.createElement("div");
  root.className = COACH_ROOT_CLASS;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-live", "polite");
  root.hidden = true;

  const titleEl = document.createElement("p");
  titleEl.className = `${COACH_ROOT_CLASS}__title`;
  const bodyEl = document.createElement("p");
  bodyEl.className = `${COACH_ROOT_CLASS}__body`;
  const actions = document.createElement("div");
  actions.className = `${COACH_ROOT_CLASS}__actions`;
  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = `${COACH_ROOT_CLASS}__next`;
  nextBtn.textContent = "Next";
  const dismissBtn = document.createElement("button");
  dismissBtn.type = "button";
  dismissBtn.className = `${COACH_ROOT_CLASS}__dismiss`;
  dismissBtn.textContent = "Dismiss";
  actions.append(nextBtn, dismissBtn);
  root.append(titleEl, bodyEl, actions);
  parent.append(root);

  const sync = (): void => {
    const progress = readArrivalQuestProgress();
    if (progress === null || !isArrivalQuestActive()) {
      root.hidden = true;
      return;
    }
    const copy = getArrivalQuestCoachCopy(progress);
    if (copy === null) {
      root.hidden = true;
      return;
    }
    titleEl.textContent = copy.title;
    bodyEl.textContent = copy.body;
    nextBtn.hidden = false;
    dismissBtn.hidden = false;
    root.hidden = false;
  };

  const onDismiss = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    dismissArrivalQuestCoach();
    sync();
  };

  const onNext = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    advanceArrivalQuestStep();
    sync();
  };

  dismissBtn.addEventListener("click", onDismiss);
  nextBtn.addEventListener("click", onNext);

  sync();

  return {
    sync,
    destroy: () => {
      root.remove();
    },
  };
};

export const ECONEXT_URL = "https://econext.llc";

export type ShowCitizenCardOptions = {
  readonly nodeId: string;
  readonly parent?: HTMLElement;
  readonly onDismiss?: () => void;
};

const truncateNodeId = (nodeId: string): string => {
  if (nodeId.length <= 16) {
    return nodeId;
  }
  return `${nodeId.slice(0, 8)}…${nodeId.slice(-6)}`;
};

const CITIZEN_STYLE_ID = "agent-play-arrival-citizen-card-styles";

const ensureCitizenCardStyles = (): void => {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById(CITIZEN_STYLE_ID) !== null) {
    return;
  }
  const style = document.createElement("style");
  style.id = CITIZEN_STYLE_ID;
  style.textContent = `
.arrival-citizen-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: grid;
  place-items: center;
  background: rgba(30, 41, 36, 0.42);
  font-family: ui-sans-serif, system-ui, sans-serif;
  padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  box-sizing: border-box;
}
.arrival-citizen-overlay .human-onboard-card {
  width: min(420px, 100%);
  max-width: 420px;
  max-height: min(85dvh, 720px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 20px;
  border-radius: 16px;
  background: #faf8f2;
  color: #1e293b;
  border: 1px solid rgba(94, 124, 110, 0.35);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
  display: grid;
  gap: 12px;
}
.arrival-citizen-overlay .human-onboard-card h2 { margin: 0; font-size: 18px; color: #0f172a; }
.arrival-citizen-overlay .human-onboard-card p { margin: 0; font-size: 13px; line-height: 1.45; color: #334155; }
.arrival-citizen-overlay .human-onboard-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.arrival-citizen-overlay .human-onboard-actions button,
.arrival-citizen-overlay .human-onboard-link-btn {
  border-radius: 8px;
  min-height: 44px;
  padding: 10px 14px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid rgba(45, 122, 110, 0.55);
  background: rgba(45, 122, 110, 0.92);
  color: #fff;
  touch-action: manipulation;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.arrival-citizen-overlay .human-onboard-actions button.secondary {
  background: transparent;
  color: #334155;
  border-color: rgba(94, 124, 110, 0.45);
}
.arrival-citizen-node {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  word-break: break-all;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(94, 124, 110, 0.12);
  color: #0f172a;
}
@media (max-width: 767px) {
  .arrival-citizen-overlay {
    place-items: end center;
    align-items: end;
    padding-left: max(0px, env(safe-area-inset-left));
    padding-right: max(0px, env(safe-area-inset-right));
    padding-bottom: 0;
  }
  .arrival-citizen-overlay .human-onboard-card {
    width: 100%;
    max-width: none;
    border-radius: 16px 16px 0 0;
    max-height: min(85dvh, 640px);
    padding: 20px 16px max(16px, env(safe-area-inset-bottom));
  }
  .arrival-citizen-overlay .human-onboard-actions--citizen {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }
  .arrival-citizen-overlay .human-onboard-actions--citizen > * {
    width: 100%;
  }
}
`;
  document.head.append(style);
};

export const showCitizenCard = (
  options: ShowCitizenCardOptions
): { destroy(): void } => {
  ensureCitizenCardStyles();
  const parent = options.parent ?? document.body;
  const existing = parent.querySelector("[data-arrival-citizen-card='1']");
  if (existing !== null) {
    return {
      destroy: () => {
        existing.remove();
      },
    };
  }
  const overlay = document.createElement("div");
  overlay.className = "arrival-citizen-overlay";
  overlay.setAttribute("data-arrival-citizen-card", "1");
  const card = document.createElement("div");
  card.className = "human-onboard-card";
  const heading = document.createElement("h2");
  heading.textContent = "Day 1 citizen";
  const copy = document.createElement("p");
  copy.textContent =
    "You’re part of Agent Play World. Friends can send APU to your node id. Bank it on Econext — buy, sell, transfer, withdraw to SOL.";
  const nodeLabel = document.createElement("div");
  nodeLabel.className = "arrival-citizen-node";
  nodeLabel.textContent = truncateNodeId(options.nodeId);
  nodeLabel.title = options.nodeId;
  const actions = document.createElement("div");
  actions.className = "human-onboard-actions human-onboard-actions--citizen";
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.textContent = "Copy node id";
  const econextLink = document.createElement("a");
  econextLink.href = ECONEXT_URL;
  econextLink.target = "_blank";
  econextLink.rel = "noopener noreferrer";
  econextLink.className = "human-onboard-link-btn";
  econextLink.textContent = "Open Econext";
  const keepBtn = document.createElement("button");
  keepBtn.type = "button";
  keepBtn.className = "secondary";
  keepBtn.textContent = "Keep exploring";
  actions.append(copyBtn, econextLink, keepBtn);
  card.append(heading, copy, nodeLabel, actions);
  overlay.append(card);
  parent.append(overlay);

  copyBtn.addEventListener("click", () => {
    void navigator.clipboard?.writeText(options.nodeId);
  });

  const close = (): void => {
    dismissCitizenCard();
    overlay.remove();
    options.onDismiss?.();
  };
  keepBtn.addEventListener("click", close);
  econextLink.addEventListener("click", () => {
    dismissCitizenCard();
    overlay.remove();
    options.onDismiss?.();
  });

  return {
    destroy: () => {
      overlay.remove();
    },
  };
};
