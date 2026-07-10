import type { PlayableGameId } from "./game-stage-registry.js";

export type GameHowToPlayHandle = {
  showForGame(gameId: PlayableGameId): void;
  open(): void;
  dismiss(): void;
  hide(): void;
  isExpanded(): boolean;
  isCollapsedButtonVisible(): boolean;
  destroy(): void;
};

export type CreateGameHowToPlayPanelOptions = {
  readonly parent: HTMLElement;
};

const PANEL_CLASS = "preview-game-how-to-play";

type HowToPlayContent = {
  readonly title: string;
  readonly steps: readonly string[];
};

const HOW_TO_PLAY_BY_GAME: Readonly<Record<PlayableGameId, HowToPlayContent>> = {
  "hidden-gems": {
    title: "Hidden Gems",
    steps: [
      "Open the six chests in order from left to right.",
      "Correct picks earn Power-Ups; wrong picks cost PU after your first round.",
      "Walk to the exit door when you are done.",
    ],
  },
  "map-recall": {
    title: "Map Recall",
    steps: [
      "Watch the structure sequence, then tap the matching buttons in order.",
      "Perfect recall earns the most PU; one mistake still pays a little.",
      "Use the joystick to reach the exit door when finished.",
    ],
  },
  "price-check": {
    title: "Price Check",
    steps: [
      "Guess whether the next item costs higher or lower than the last.",
      "You get three rounds per visit.",
      "Leave through the exit door at the bottom-left when done.",
    ],
  },
  "signal-hunt": {
    title: "Signal Hunt",
    steps: [
      "Read the callout, then pick the matching structure label.",
      "Correct picks earn PU; wrong picks cost PU.",
      "Walk to the exit door to return to Maple Ave.",
    ],
  },
  "delivery-dash": {
    title: "Delivery Dash",
    steps: [
      "Move the courier across the grid with arrow keys to reach the green goal.",
      "Fewer moves and fewer wall hits earn more PU.",
      "Your avatar can still roam the stage with the joystick to reach the exit.",
    ],
  },
  "lease-locker": {
    title: "Lease Locker",
    steps: [
      "Read the riddle and pick the amenity door that matches.",
      "Correct doors earn PU; wrong doors cost PU.",
      "Use the joystick to walk to the exit door when finished.",
    ],
  },
  "talk-timer": {
    title: "Talk Timer",
    steps: [
      "Hold Space or the transmit control to land the needle in the green zone.",
      "You get three rounds with shrinking windows.",
      "Walk to the exit door when your run is complete.",
    ],
  },
};

export const howToPlayStorageKey = (gameId: PlayableGameId): string =>
  `agent-play:how-to-play-seen:${gameId}`;

export const hasSeenHowToPlay = (gameId: PlayableGameId): boolean => {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(howToPlayStorageKey(gameId)) === "1";
};

export const markHowToPlaySeen = (gameId: PlayableGameId): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(howToPlayStorageKey(gameId), "1");
};

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-game-how-to-play-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${PANEL_CLASS} {
  position: fixed;
  top: 64px;
  left: 12px;
  z-index: 13200;
  font-family: system-ui, sans-serif;
}
.${PANEL_CLASS}__toggle {
  border: none;
  border-radius: 999px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #4c1d95, #7c3aed);
  color: #f5f3ff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(76,29,149,0.35);
}
.${PANEL_CLASS}__toggle:hover { transform: translateY(-1px); }
.${PANEL_CLASS}__card {
  display: none;
  width: min(360px, 88vw);
  margin-top: 8px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(180deg, #fdf4ff 0%, #f5f3ff 100%);
  color: #1e1b4b;
  box-shadow: 0 16px 40px rgba(15,23,42,0.28);
}
.${PANEL_CLASS}__card--open { display: block; }
.${PANEL_CLASS}__header {
  padding: 14px 16px;
  background: linear-gradient(135deg, #6d28d9, #7c3aed);
  color: #faf5ff;
}
.${PANEL_CLASS}__title { margin: 0; font-size: 16px; font-weight: 800; }
.${PANEL_CLASS}__body { padding: 14px 16px 16px; }
.${PANEL_CLASS}__steps {
  margin: 0 0 14px 0;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.45;
}
.${PANEL_CLASS}__steps li { margin-bottom: 6px; }
.${PANEL_CLASS}__dismiss {
  border: none;
  border-radius: 10px;
  padding: 8px 14px;
  background: #5b21b6;
  color: #faf5ff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
@media (prefers-reduced-motion: reduce) {
  .${PANEL_CLASS}__toggle { transition: none; }
}
`;
  document.head.appendChild(style);
};

export const createGameHowToPlayPanel = (
  options: CreateGameHowToPlayPanelOptions
): GameHowToPlayHandle => {
  ensureStyles();

  const root = document.createElement("div");
  root.className = PANEL_CLASS;
  root.style.display = "none";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = `${PANEL_CLASS}__toggle`;
  toggle.textContent = "How to play";
  toggle.setAttribute("aria-label", "Show how to play");

  const card = document.createElement("div");
  card.className = `${PANEL_CLASS}__card`;
  const header = document.createElement("div");
  header.className = `${PANEL_CLASS}__header`;
  const title = document.createElement("h3");
  title.className = `${PANEL_CLASS}__title`;
  header.appendChild(title);
  const body = document.createElement("div");
  body.className = `${PANEL_CLASS}__body`;
  const stepsList = document.createElement("ol");
  stepsList.className = `${PANEL_CLASS}__steps`;
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = `${PANEL_CLASS}__dismiss`;
  dismiss.textContent = "Got it";
  body.append(stepsList, dismiss);
  card.append(header, body);
  root.append(toggle, card);
  options.parent.appendChild(root);

  let expanded = false;
  let activeGameId: PlayableGameId | null = null;

  const renderContent = (gameId: PlayableGameId): void => {
    const content = HOW_TO_PLAY_BY_GAME[gameId];
    title.textContent = content.title;
    stepsList.innerHTML = content.steps.map((step) => `<li>${step}</li>`).join("");
  };

  const setExpanded = (next: boolean): void => {
    expanded = next;
    card.classList.toggle(`${PANEL_CLASS}__card--open`, next);
    toggle.setAttribute("aria-expanded", next ? "true" : "false");
  };

  toggle.addEventListener("click", () => {
    if (activeGameId === null) return;
    setExpanded(true);
  });

  dismiss.addEventListener("click", () => {
    if (activeGameId !== null) {
      markHowToPlaySeen(activeGameId);
    }
    setExpanded(false);
  });

  return {
    showForGame: (gameId) => {
      activeGameId = gameId;
      root.style.display = "";
      renderContent(gameId);
      setExpanded(!hasSeenHowToPlay(gameId));
    },
    open: () => {
      if (activeGameId === null) return;
      setExpanded(true);
    },
    dismiss: () => {
      if (activeGameId !== null) {
        markHowToPlaySeen(activeGameId);
      }
      setExpanded(false);
    },
    hide: () => {
      activeGameId = null;
      root.style.display = "none";
      setExpanded(false);
    },
    isExpanded: () => expanded,
    isCollapsedButtonVisible: () => root.style.display !== "none",
    destroy: () => {
      root.remove();
    },
  };
};
