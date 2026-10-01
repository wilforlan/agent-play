import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { OgBrandImage } from "./og-brand-image";
import { OgV0peerWorldImage } from "./og-v0peer-world-image";
import { ogImageContentType, ogImageSize } from "./og-image-meta";
import {
  normalizeRequestHost,
  resolveRootSeoCatalogFromHost,
} from "@/lib/agent-play-seo";

export const runtime = "edge";

export const size = ogImageSize;

export const contentType = ogImageContentType;

const readRequestHost = async (): Promise<string> => {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-host");
  const host = headerList.get("host");
  const raw = forwarded?.split(",")[0]?.trim() || host?.trim() || "";
  if (raw.length === 0) {
    return "agent-play.com";
  }
  return normalizeRequestHost(raw);
};

export const alt = "Agent Play Twitter image";

export default async function TwitterImage() {
  const host = await readRequestHost();
  const resolved = resolveRootSeoCatalogFromHost(host);

  if (resolved.kind === "v0peer") {
    const catalog = resolved.catalog;
    return new ImageResponse(
      (
        <OgV0peerWorldImage
          worldIndex={catalog.worldIndex}
          variant={catalog.variant}
          title={catalog.defaultTitle}
          description={catalog.defaultDescription}
        />
      ),
      {
        width: ogImageSize.width,
        height: ogImageSize.height,
      },
    );
  }

  return new ImageResponse(<OgBrandImage />, {
    width: ogImageSize.width,
    height: ogImageSize.height,
  });
}
