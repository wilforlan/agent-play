import type { GameStats } from "@agent-play/sdk/browser";
import { DAILY_GAME_PU_CAP, WALLET_BUNDLE_OFFERS } from "@agent-play/sdk/browser";

export type GameStreakPanelHandle = {
  readonly root: HTMLElement;
  readonly pill: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  setStats(stats: GameStats, powerUps: number): void;
  setLoading(): void;
  setError(message: string): void;
  destroy(): void;
};

export type CreateGameStreakPanelOptions = {
  readonly parent: HTMLElement;
  readonly onRefresh: () => void;
};

const PANEL_CLASS = "preview-game-streak";
const PEEK_SESSION_KEY = "agent-play:game-streak-peeked";

export const powerUpsToNextBundle = (powerUps: number): number | null => {
  const sorted = [...WALLET_BUNDLE_OFFERS].sort(
    (a, b) => a.powerUpsCost - b.powerUpsCost
  );
  const next = sorted.find((offer) => offer.powerUpsCost > powerUps);
  if (next === undefined) return null;
  return Math.max(0, next.powerUpsCost - powerUps);
};

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-game-streak-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${PANEL_CLASS}-pill {
  position: fixed;
  top: 12px;
  right: 148px;
  z-index: 13000;
  border: none;
  border-radius: 999px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #7c2d12, #b45309);
  color: #fff7ed;
  font-family: system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(124,45,18,0.35);
}
.${PANEL_CLASS}-pill:hover { transform: translateY(-1px); }
.${PANEL_CLASS}-backdrop {
  position: fixed;
  inset: 0;
  z-index: 13150;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(15,23,42,0.5);
  backdrop-filter: blur(2px);
}
.${PANEL_CLASS}-backdrop--open { display: flex; }
.${PANEL_CLASS} {
  width: min(440px, 92vw);
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(180deg, #fdfbf4 0%, #f8f1e3 100%);
  color: #1f2937;
  font-family: system-ui, sans-serif;
  box-shadow: 0 20px 60px rgba(15,23,42,0.35);
}
.${PANEL_CLASS}__header {
  padding: 18px 20px;
  background: linear-gradient(135deg, #7c2d12, #9a3412);
  color: #fff7ed;
}
.${PANEL_CLASS}__title { margin: 0; font-size: 18px; font-weight: 800; }
.${PANEL_CLASS}__body { padding: 18px 20px 20px; }
.${PANEL_CLASS}__row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}
.${PANEL_CLASS}__bar {
  height: 8px;
  border-radius: 999px;
  background: #e7e5e4;
  overflow: hidden;
  margin: 10px 0 14px;
}
.${PANEL_CLASS}__bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #0f766e, #14b8a6);
}
.${PANEL_CLASS}__hint {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}
.${PANEL_CLASS}__shimmer-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.${PANEL_CLASS}__shimmer-row {
  height: 18px;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    #e7e5e4 0%,
    #f5f5f4 35%,
    #fde68a 50%,
    #f5f5f4 65%,
    #e7e5e4 100%
  );
  background-size: 240% 100%;
  animation: ${PANEL_CLASS}-shimmer 1.4s ease-in-out infinite;
}
.${PANEL_CLASS}__shimmer-row--short { width: 62%; }
.${PANEL_CLASS}__shimmer-row--medium { width: 78%; }
.${PANEL_CLASS}__shimmer-row--long { width: 100%; }
@keyframes ${PANEL_CLASS}-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .${PANEL_CLASS}__shimmer-row { animation: none; }
}
@media (prefers-reduced-motion: reduce) {
  .${PANEL_CLASS}-pill { transition: none; }
}
`;
  document.head.appendChild(style);
};

export const createGameStreakPanel = (
  options: CreateGameStreakPanelOptions
): GameStreakPanelHandle => {
  ensureStyles();

  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = `${PANEL_CLASS}-pill`;
  pill.textContent = "Games G";
  pill.setAttribute("aria-label", "Open game streak panel");
  options.parent.appendChild(pill);

  const backdrop = document.createElement("div");
  backdrop.className = `${PANEL_CLASS}-backdrop`;
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-label", "Game streak");

  const panel = document.createElement("div");
  panel.className = PANEL_CLASS;
  const header = document.createElement("div");
  header.className = `${PANEL_CLASS}__header`;
  const title = document.createElement("h2");
  title.className = `${PANEL_CLASS}__title`;
  title.textContent = "Arcade streak";
  header.appendChild(title);
  const body = document.createElement("div");
  body.className = `${PANEL_CLASS}__body`;
  panel.append(header, body);
  backdrop.appendChild(panel);
  options.parent.appendChild(backdrop);

  let open = false;

  const close = (): void => {
    open = false;
    backdrop.classList.remove(`${PANEL_CLASS}-backdrop--open`);
  };

  const openPanel = (): void => {
    open = true;
    backdrop.classList.add(`${PANEL_CLASS}-backdrop--open`);
    options.onRefresh();
  };

  const renderStats = (stats: GameStats, powerUps: number): void => {
    const earned = stats.puEarnedToday;
    const cap = DAILY_GAME_PU_CAP;
    const pct = cap > 0 ? Math.min(100, Math.round((earned / cap) * 100)) : 0;
    const bundleGap = powerUpsToNextBundle(powerUps);
    const bundleLine =
      bundleGap === null
        ? "You can redeem every bundle offer."
        : `${String(bundleGap)} PU to next $10 bundle`;
    body.innerHTML = `
      <div class="${PANEL_CLASS}__row"><span>Day streak</span><strong>${String(stats.dayStreak)}</strong></div>
      <div class="${PANEL_CLASS}__row"><span>Best streak</span><strong>${String(stats.bestStreak)}</strong></div>
      <div class="${PANEL_CLASS}__row"><span>PU today</span><strong>${String(earned)} / ${String(cap)}</strong></div>
      <div class="${PANEL_CLASS}__bar"><div class="${PANEL_CLASS}__bar-fill" style="width:${String(pct)}%"></div></div>
      <div class="${PANEL_CLASS}__row"><span>Games played</span><strong>${String(stats.gamesPlayedToday)}</strong></div>
      <div class="${PANEL_CLASS}__row"><span>Featured cabinet</span><strong>${stats.featuredGameId}</strong></div>
      <p class="${PANEL_CLASS}__hint">${bundleLine}</p>
    `;
    pill.textContent =
      stats.dayStreak > 0 ? `Streak ${String(stats.dayStreak)}` : "Games G";
  };

  pill.addEventListener("click", openPanel);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && open) close();
  };
  document.addEventListener("keydown", onKey);

  return {
    root: backdrop,
    pill,
    open: openPanel,
    close,
    isOpen: () => open,
    setStats: renderStats,
    setLoading: () => {
      body.innerHTML = `
        <div class="${PANEL_CLASS}__shimmer-wrap" aria-busy="true" aria-label="Loading arcade stats">
          <div class="${PANEL_CLASS}__shimmer-row ${PANEL_CLASS}__shimmer-row--medium"></div>
          <div class="${PANEL_CLASS}__shimmer-row ${PANEL_CLASS}__shimmer-row--long"></div>
          <div class="${PANEL_CLASS}__shimmer-row ${PANEL_CLASS}__shimmer-row--short"></div>
          <div class="${PANEL_CLASS}__shimmer-row ${PANEL_CLASS}__shimmer-row--long"></div>
          <div class="${PANEL_CLASS}__shimmer-row ${PANEL_CLASS}__shimmer-row--medium"></div>
        </div>
      `;
    },
    setError: (message) => {
      body.textContent = message;
    },
    destroy: () => {
      document.removeEventListener("keydown", onKey);
      pill.remove();
      backdrop.remove();
    },
  };
};

export const shouldAutoPeekGameStreak = (): boolean => {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(PEEK_SESSION_KEY) !== "1";
};

export const markGameStreakAutoPeeked = (): void => {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PEEK_SESSION_KEY, "1");
};
