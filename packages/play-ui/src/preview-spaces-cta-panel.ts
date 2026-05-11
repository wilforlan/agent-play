const STYLE_ID = "agent-play-preview-spaces-cta-panel-styles";

export const PREVIEW_SPACES_CTA_DISMISSED_STORAGE_KEY =
  "agent-play:preview-spaces-cta:dismissed:v1";

const PLATFORM_HREF = "/platform";
const DEFAULT_PREFERRED_WIDTH_PX = 320;
const DEFAULT_PREFERRED_HEIGHT_PX = 320;
const DEFAULT_GAP_PX = 12;
const VIEWPORT_PADDING_PX = 8;
const MIN_VISIBLE_HEIGHT_PX = 96;

const AQL_SAMPLE_LINES: readonly string[] = [
  "CREATE SPACE neighborhood-hq",
  "ADD AMENITY pricing-tool TO neighborhood-hq",
  "GRANT agent.assistant ENTER neighborhood-hq",
] as const;

export type SpacesCtaPlacementInput = {
  anchorRect: { left: number; top: number; width: number; height: number };
  boundsRect: { left: number; top: number; width: number; height: number };
  preferredHeightPx?: number;
  preferredWidthPx?: number;
  gapPx?: number;
};

export type SpacesCtaPlacement = {
  leftPx: number;
  topPx: number;
  maxHeightPx: number;
};

export function computeSpacesCtaPlacement(
  input: SpacesCtaPlacementInput
): SpacesCtaPlacement {
  const preferredHeight =
    input.preferredHeightPx ?? DEFAULT_PREFERRED_HEIGHT_PX;
  const preferredWidth = input.preferredWidthPx ?? DEFAULT_PREFERRED_WIDTH_PX;
  const gap = input.gapPx ?? DEFAULT_GAP_PX;

  const anchorLeftLocal = input.anchorRect.left - input.boundsRect.left;
  const anchorBottomLocal =
    input.anchorRect.top + input.anchorRect.height - input.boundsRect.top;

  const desiredTop = anchorBottomLocal + gap;
  const maxLeft = Math.max(
    0,
    input.boundsRect.width - preferredWidth - VIEWPORT_PADDING_PX
  );
  const leftPx = Math.max(0, Math.min(anchorLeftLocal, maxLeft));

  const bottomLimit = input.boundsRect.height - VIEWPORT_PADDING_PX;
  let topPx = Math.max(0, desiredTop);
  let maxHeightPx = Math.max(
    MIN_VISIBLE_HEIGHT_PX,
    Math.min(preferredHeight, bottomLimit - topPx)
  );

  if (topPx + maxHeightPx > bottomLimit) {
    const shrinkRoom = bottomLimit - MIN_VISIBLE_HEIGHT_PX;
    topPx = Math.max(0, Math.min(topPx, shrinkRoom));
    maxHeightPx = Math.max(
      MIN_VISIBLE_HEIGHT_PX,
      Math.min(preferredHeight, bottomLimit - topPx)
    );
  }

  return { leftPx, topPx, maxHeightPx };
}

function ensureStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.preview-floating-panel--spaces-cta {
  position: absolute;
  z-index: 39;
  width: min(${DEFAULT_PREFERRED_WIDTH_PX}px, calc(100vw - 24px));
  max-height: min(60dvh, ${DEFAULT_PREFERRED_HEIGHT_PX}px);
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 14px 14px 12px;
  border-radius: 14px;
  border: 1px solid rgba(244, 114, 182, 0.45);
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(168, 85, 247, 0.45), transparent 55%),
    radial-gradient(120% 80% at 100% 100%, rgba(251, 146, 60, 0.4), transparent 55%),
    linear-gradient(180deg, rgba(17, 24, 39, 0.96), rgba(15, 23, 42, 0.95));
  box-shadow: 0 0 0 1px rgba(244, 114, 182, 0.12),
    0 12px 28px -16px rgba(168, 85, 247, 0.55);
  isolation: isolate;
  color: #e2e8f0;
  font-family: ui-sans-serif, system-ui, sans-serif;
  pointer-events: auto;
}
.preview-floating-panel--spaces-cta[hidden] {
  display: none;
}
.preview-canvas-stage.preview-canvas-stage--stationary-panels
  .preview-game-col--left
  .preview-floating-panel--spaces-cta {
  width: min(100%, ${DEFAULT_PREFERRED_WIDTH_PX}px);
  max-width: 100%;
}
.preview-floating-panel--spaces-cta::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    120deg,
    rgba(244, 114, 182, 0.65),
    rgba(168, 85, 247, 0.45),
    rgba(56, 189, 248, 0.55),
    rgba(251, 146, 60, 0.6)
  );
  background-size: 300% 300%;
  -webkit-mask:
    linear-gradient(#000, #000) content-box,
    linear-gradient(#000, #000);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  animation: preview-spaces-cta-panel-shimmer 6s linear infinite;
  pointer-events: none;
  z-index: 0;
}
@media (prefers-reduced-motion: reduce) {
  .preview-floating-panel--spaces-cta::before {
    animation: none;
  }
}
@keyframes preview-spaces-cta-panel-shimmer {
  0%   { background-position:   0% 50%; }
  100% { background-position: 300% 50%; }
}
.preview-spaces-cta-panel__scroll {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
  position: relative;
  z-index: 1;
}
.preview-spaces-cta-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.preview-spaces-cta-panel__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #fbcfe8;
  font-family: "Press Start 2P", ui-monospace, monospace;
}
.preview-spaces-cta-panel__eyebrow::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #f472b6;
  box-shadow: 0 0 8px rgba(244, 114, 182, 0.9);
}
.preview-spaces-cta-panel__dismiss {
  appearance: none;
  background: rgba(15, 23, 42, 0.6);
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 999px;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  padding: 0;
}
.preview-spaces-cta-panel__dismiss:hover {
  border-color: rgba(244, 114, 182, 0.7);
  color: #fdf2f8;
}
.preview-spaces-cta-panel__title {
  margin: 0;
  font-size: 13px;
  line-height: 1.2;
  color: #fdf2f8;
  font-family: "Press Start 2P", ui-monospace, monospace;
}
.preview-spaces-cta-panel__body {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #e2e8f0;
}
.preview-spaces-cta-panel__pillars {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.preview-spaces-cta-panel__pillar {
  font-size: 9px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fef3c7;
  font-family: "Press Start 2P", ui-monospace, monospace;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(253, 224, 71, 0.4);
  background: rgba(15, 23, 42, 0.55);
}
.preview-spaces-cta-panel__code {
  display: block;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.85);
  color: #bae6fd;
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-size: 11px;
  line-height: 1.45;
  white-space: pre;
  overflow-x: auto;
  border: 1px solid rgba(56, 189, 248, 0.25);
}
.preview-spaces-cta-panel__code-keyword {
  color: #f472b6;
  font-weight: 600;
}
.preview-spaces-cta-panel__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 999px;
  background: linear-gradient(120deg, #f472b6 0%, #a855f7 55%, #38bdf8 100%);
  color: #0f172a;
  font-family: "Press Start 2P", ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  text-align: center;
  box-shadow: 0 8px 20px -8px rgba(168, 85, 247, 0.7);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.preview-spaces-cta-panel__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px -10px rgba(168, 85, 247, 0.85);
}
.preview-spaces-cta-panel__cta:active {
  transform: translateY(0);
}
.preview-spaces-cta-panel__footnote {
  margin: 0;
  font-size: 10px;
  color: #cbd5f5;
}
`;
  document.head.appendChild(style);
}

function safeReadDismissed(): boolean {
  try {
    return (
      window.localStorage.getItem(PREVIEW_SPACES_CTA_DISMISSED_STORAGE_KEY) ===
      "1"
    );
  } catch {
    return false;
  }
}

function safeWriteDismissed(): void {
  try {
    window.localStorage.setItem(
      PREVIEW_SPACES_CTA_DISMISSED_STORAGE_KEY,
      "1"
    );
  } catch {
    /* storage may be blocked; the in-memory dismissed state still applies */
  }
}

function appendHighlightedAqlLine(parent: HTMLElement, line: string): void {
  const trimmed = line.trim();
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace <= 0) {
    parent.append(document.createTextNode(`${line}\n`));
    return;
  }
  const keyword = trimmed.slice(0, firstSpace);
  const rest = trimmed.slice(firstSpace);
  const span = document.createElement("span");
  span.className = "preview-spaces-cta-panel__code-keyword";
  span.textContent = keyword;
  parent.append(span);
  parent.append(document.createTextNode(`${rest}\n`));
}

export type PreviewSpacesCtaPanel = {
  element: HTMLElement;
  isDismissed: () => boolean;
  refresh: (geometry: {
    anchorRect: SpacesCtaPlacementInput["anchorRect"];
    boundsRect: SpacesCtaPlacementInput["boundsRect"];
  }) => void;
};

export function createPreviewSpacesCtaPanel(): PreviewSpacesCtaPanel {
  ensureStyles();

  let dismissed = safeReadDismissed();

  const root = document.createElement("section");
  root.className =
    "preview-floating-panel preview-floating-panel--spaces-cta";
  root.setAttribute("aria-label", "Build your own space");
  root.hidden = dismissed;

  const scroll = document.createElement("div");
  scroll.className = "preview-spaces-cta-panel__scroll";

  const header = document.createElement("div");
  header.className = "preview-spaces-cta-panel__header";

  const eyebrow = document.createElement("span");
  eyebrow.className = "preview-spaces-cta-panel__eyebrow";
  eyebrow.textContent = "Spaces";

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "preview-spaces-cta-panel__dismiss";
  dismiss.setAttribute("aria-label", "Dismiss spaces promo");
  dismiss.dataset.testid = "preview-spaces-cta-dismiss";
  dismiss.textContent = "\u00d7";

  header.append(eyebrow, dismiss);

  const title = document.createElement("h3");
  title.className = "preview-spaces-cta-panel__title";
  title.textContent = "Build your own space";

  const body = document.createElement("p");
  body.className = "preview-spaces-cta-panel__body";
  body.textContent =
    "Compose agents, amenities, and policies with AQL — then watch them come alive on the map.";

  const pillars = document.createElement("ul");
  pillars.className = "preview-spaces-cta-panel__pillars";
  for (const label of ["Spaces", "Amenities", "AQL"]) {
    const li = document.createElement("li");
    li.className = "preview-spaces-cta-panel__pillar";
    li.textContent = label;
    pillars.appendChild(li);
  }

  const codeWrap = document.createElement("pre");
  codeWrap.className = "preview-spaces-cta-panel__code";
  const code = document.createElement("code");
  code.setAttribute("aria-label", "Sample AQL");
  for (const line of AQL_SAMPLE_LINES) {
    appendHighlightedAqlLine(code, line);
  }
  codeWrap.appendChild(code);

  const cta = document.createElement("a");
  cta.className = "preview-spaces-cta-panel__cta";
  cta.href = PLATFORM_HREF;
  cta.dataset.testid = "preview-spaces-cta-button";
  cta.textContent = "Create your space  \u2192";

  const footnote = document.createElement("p");
  footnote.className = "preview-spaces-cta-panel__footnote";
  footnote.textContent =
    "Open the platform to learn AQL and see real-world space recipes.";

  scroll.append(header, title, body, pillars, codeWrap, cta, footnote);
  root.append(scroll);

  dismiss.addEventListener("click", () => {
    dismissed = true;
    root.hidden = true;
    root.style.left = "";
    root.style.top = "";
    root.style.maxHeight = "";
    safeWriteDismissed();
  });

  const refresh: PreviewSpacesCtaPanel["refresh"] = ({
    anchorRect,
    boundsRect,
  }) => {
    if (dismissed) {
      return;
    }
    const placement = computeSpacesCtaPlacement({
      anchorRect,
      boundsRect,
      preferredHeightPx: DEFAULT_PREFERRED_HEIGHT_PX,
      preferredWidthPx: DEFAULT_PREFERRED_WIDTH_PX,
      gapPx: DEFAULT_GAP_PX,
    });
    root.style.left = `${placement.leftPx}px`;
    root.style.top = `${placement.topPx}px`;
    root.style.maxHeight = `${placement.maxHeightPx}px`;
  };

  return {
    element: root,
    isDismissed: () => dismissed,
    refresh,
  };
}
