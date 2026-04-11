import { ImageResponse } from "next/og";
import { OgBrandImage } from "./og-brand-image";
import { ogImageAlt, ogImageContentType, ogImageSize } from "./og-image-meta";

export const runtime = "edge";

export const alt = ogImageAlt;

export const size = ogImageSize;

export const contentType = ogImageContentType;

export default function TwitterImage() {
  return new ImageResponse(<OgBrandImage />, {
    width: ogImageSize.width,
    height: ogImageSize.height,
  });
}
