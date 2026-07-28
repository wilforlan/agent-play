export type BottomHudDockHandle = {
  readonly root: HTMLElement;
  destroy(): void;
};

export type CreateBottomHudDockOptions = {
  readonly parent: HTMLElement;
};

const DOCK_CLASS = "preview-bottom-hud-dock";

const ensureStyles = (): void => {
  if (typeof document === "undefined") return;
  const id = "preview-bottom-hud-dock-styles";
  if (document.getElementById(id) !== null) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
.${DOCK_CLASS} {
  position: fixed;
  top: auto;
  right: 12px;
  bottom: max(12px, calc(12px + env(safe-area-inset-bottom, 0px)));
  z-index: 13000;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  max-width: calc(100vw - 24px);
  pointer-events: none;
}
.${DOCK_CLASS} > * {
  pointer-events: auto;
}
`;
  document.head.appendChild(style);
};

export const createBottomHudDock = (
  options: CreateBottomHudDockOptions
): BottomHudDockHandle => {
  ensureStyles();
  const root = document.createElement("div");
  root.className = DOCK_CLASS;
  root.setAttribute("aria-label", "Wallet and arcade controls");
  options.parent.appendChild(root);
  return {
    root,
    destroy: () => {
      root.remove();
    },
  };
};
