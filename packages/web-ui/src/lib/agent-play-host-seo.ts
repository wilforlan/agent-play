import { z } from "zod";

const DEFAULT_ORIGIN = "https://agent-play.com";
const LEGAL_NAME = "Viroke Technologies Inc (a Delaware US corporation)";
const V0PEER_THEME_COLOR = "#f3eee4";
const WORLD_HOST_PATTERN = /^world(\d+)\.v0peer\.org$/;

type ResolveAgentPlayOriginOptions = {
  envValue?: string;
};

export const resolveAgentPlayOrigin = (
  options: ResolveAgentPlayOriginOptions = {},
): string => {
  const trimmed = options.envValue?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed.replace(/\/$/, "");
  }
  return DEFAULT_ORIGIN;
};

const V0peerWorldSeoSchema = z.object({
  brandName: z.string().min(1),
  siteName: z.string().min(1),
  legalName: z.string().min(1),
  defaultTitle: z.string().min(40).max(65),
  defaultDescription: z.string().min(110).max(160),
  keywords: z.array(z.string().min(1)).min(8),
  logoPath: z.literal("/agent-play-logo.png"),
  ogImagePath: z.literal("/opengraph-image"),
  themeColor: z.literal(V0PEER_THEME_COLOR),
  variant: z.enum(["main-world", "convergence"]),
  worldIndex: z.number().int().positive().nullable(),
});

export type V0peerWorldSeo = z.infer<typeof V0peerWorldSeoSchema>;

export type ResolvedOgImageCatalog =
  | { kind: "agent-play" }
  | { kind: "v0peer"; catalog: V0peerWorldSeo };

export const normalizeRequestHost = (raw: string): string => {
  const withoutPort = raw.trim().toLowerCase().split(":")[0] ?? "";
  return withoutPort.replace(/^www\./, "");
};

export const isAgentPlayPublicHost = (host: string): boolean => {
  const normalized = normalizeRequestHost(host);
  return normalized === "agent-play.com";
};

export const isV0peerPublicHost = (host: string): boolean => {
  const normalized = normalizeRequestHost(host);
  return (
    normalized === "v0peer.org" || normalized.endsWith(".v0peer.org")
  );
};

export const parseWorldIndexFromHost = (host: string): number | null => {
  const normalized = normalizeRequestHost(host);
  const match = WORLD_HOST_PATTERN.exec(normalized);
  if (match === null) {
    return null;
  }
  const index = Number(match[1]);
  if (!Number.isInteger(index) || index < 1) {
    return null;
  }
  return index;
};

type ResolveSeoOriginFromHostOptions = {
  host: string;
  envOrigin?: string;
};

export const resolveSeoOriginFromHost = (
  options: ResolveSeoOriginFromHostOptions,
): string => {
  const normalized = normalizeRequestHost(options.host);
  if (isV0peerPublicHost(normalized)) {
    return `https://${normalized}`;
  }
  return resolveAgentPlayOrigin({ envValue: options.envOrigin });
};

type BuildV0peerWorldSeoOptions = {
  worldIndex: number | null;
};

export const buildV0peerWorldSeo = (
  options: BuildV0peerWorldSeoOptions,
): V0peerWorldSeo => {
  const { worldIndex } = options;
  if (worldIndex === 1) {
    return V0peerWorldSeoSchema.parse({
      brandName: "World 1",
      siteName: "World 1 — Agent Play",
      legalName: LEGAL_NAME,
      defaultTitle: "World 1 — Agent Play Main World Spatial Playground",
      defaultDescription:
        "World 1 is Agent Play Main World — a live spatial map where humans and AI agents share streets, talk, assist, and play arcade cabinets together.",
      keywords: [
        "World 1",
        "Agent Play",
        "Agent Play World",
        "Main World",
        "spatial AI",
        "AI agents",
        "v0peer",
        "Agent Play arcade",
        "APU",
        "APW",
      ],
      logoPath: "/agent-play-logo.png",
      ogImagePath: "/opengraph-image",
      themeColor: V0PEER_THEME_COLOR,
      variant: "main-world",
      worldIndex: 1,
    });
  }

  if (worldIndex === null) {
    return V0peerWorldSeoSchema.parse({
      brandName: "v0peer",
      siteName: "v0peer — Agent Play",
      legalName: LEGAL_NAME,
      defaultTitle: "Second Economy — The Convergence on v0peer Agent Play",
      defaultDescription:
        "Second Economy — The Convergence. Walk, talk, earn APU, then bank or peer-trade — street, bank, and stall settle as one money story on v0peer.",
      keywords: [
        "v0peer",
        "Second Economy",
        "The Convergence",
        "Agent Play",
        "APU",
        "Econext",
        "P2P",
        "spatial AI",
        "Agent Play World",
      ],
      logoPath: "/agent-play-logo.png",
      ogImagePath: "/opengraph-image",
      themeColor: V0PEER_THEME_COLOR,
      variant: "convergence",
      worldIndex: null,
    });
  }

  const brandName = `World ${worldIndex}`;
  return V0peerWorldSeoSchema.parse({
    brandName,
    siteName: `${brandName} — Agent Play`,
    legalName: LEGAL_NAME,
    defaultTitle: `Second Economy — The Convergence | ${brandName}`,
    defaultDescription: `${brandName}: Second Economy — The Convergence. Street, bank, and peer stall settle as one APU money story you walk, earn, and take home.`,
    keywords: [
      brandName,
      "Second Economy",
      "The Convergence",
      "Agent Play",
      "APU",
      "Econext",
      "P2P",
      "v0peer",
      "spatial AI",
      "Agent Play World",
    ],
    logoPath: "/agent-play-logo.png",
    ogImagePath: "/opengraph-image",
    themeColor: V0PEER_THEME_COLOR,
    variant: "convergence",
    worldIndex,
  });
};

export const resolveOgImageCatalogFromHost = (
  host: string,
): ResolvedOgImageCatalog => {
  const normalized = normalizeRequestHost(host);
  if (isV0peerPublicHost(normalized)) {
    return {
      kind: "v0peer",
      catalog: buildV0peerWorldSeo({
        worldIndex: parseWorldIndexFromHost(normalized),
      }),
    };
  }
  return { kind: "agent-play" };
};

export const readRequestHostFromHeaders = (headerList: {
  get: (name: string) => string | null;
}): string => {
  const forwarded = headerList.get("x-forwarded-host");
  const host = headerList.get("host");
  const raw = forwarded?.split(",")[0]?.trim() || host?.trim() || "";
  if (raw.length === 0) {
    return "agent-play.com";
  }
  return normalizeRequestHost(raw);
};
