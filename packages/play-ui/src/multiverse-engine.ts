export type MultiversePalette = {
  background: string;
  grid: string;
  structureTool: string;
  structureHome: string;
  agent: string;
  calloutBg: string;
  text: string;
  textMuted: string;
  stroke: string;
};

export const defaultMultiversePalette: MultiversePalette = {
  background: "#1a1c2e",
  grid: "rgba(100, 118, 140, 0.15)",
  structureTool: "#3b82f6",
  structureHome: "#f59e0b",
  agent: "#22d3ee",
  calloutBg: "rgba(15, 23, 42, 0.88)",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  stroke: "#334155",
};

export function mergeMultiversePalette(
  partial?: Partial<MultiversePalette>
): MultiversePalette {
  return { ...defaultMultiversePalette, ...partial };
}

export function structureFill(kind: string, palette: MultiversePalette): string {
  return kind === "home" ? palette.structureHome : palette.structureTool;
}

export function cssColorToPixi(css: string): number {
  const t = css.trim();
  if (!t.startsWith("#")) return 0xffffff;
  const h = t.slice(1);
  const full =
    h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const n = Number.parseInt(full, 16);
  return Number.isFinite(n) ? n : 0xffffff;
}
