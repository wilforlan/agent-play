import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { OgBrandImage } from "./og-brand-image";
import { OgV0peerWorldImage } from "./og-v0peer-world-image";
import { ogImageContentType, ogImageSize } from "./og-image-meta";
import {
  readRequestHostFromHeaders,
  resolveOgImageCatalogFromHost,
} from "@/lib/agent-play-host-seo";

export const runtime = "edge";

export const size = ogImageSize;

export const contentType = ogImageContentType;

export const alt = "Agent Play Twitter image";

export default async function TwitterImage() {
  const host = readRequestHostFromHeaders(await headers());
  const resolved = resolveOgImageCatalogFromHost(host);

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
