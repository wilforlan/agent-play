export type MultiversePalette = {
  background: string;
  grid: string;
  structureTool: string;
  structureHome: string;
  structureVendorAwning: string;
  structureVendorBody: string;
  structureMcpFacade: string;
  structureMcpAccent: string;
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
  structureVendorAwning: "#f97316",
  structureVendorBody: "#9a3412",
  structureMcpFacade: "#1e3a5f",
  structureMcpAccent: "#7dd3fc",
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

export function vendorStallPalette(palette: MultiversePalette): {
  awning: number;
  body: number;
  stripe: number;
  trim: number;
} {
  return {
    awning: cssColorToPixi(palette.structureVendorAwning),
    body: cssColorToPixi(palette.structureVendorBody),
    stripe: cssColorToPixi("#fcd34d"),
    trim: cssColorToPixi(palette.stroke),
  };
}

export function mcpStorePalette(palette: MultiversePalette): {
  facade: number;
  accent: number;
  glass: number;
  sign: number;
  trim: number;
} {
  return {
    facade: cssColorToPixi(palette.structureMcpFacade),
    accent: cssColorToPixi(palette.structureMcpAccent),
    glass: cssColorToPixi("#0c4a6e"),
    sign: cssColorToPixi("#e0f2fe"),
    trim: cssColorToPixi(palette.stroke),
  };
}
