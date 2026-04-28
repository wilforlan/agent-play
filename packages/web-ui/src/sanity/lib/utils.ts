import createImageUrlBuilder from "@sanity/image-url";
import type { Image } from "sanity";

import { dataset, projectId } from "@/sanity/lib/api";

const imageBuilder = createImageUrlBuilder({
  projectId,
  dataset,
});

export const urlForImage = (source: Image | null | undefined) => {
  if (!source?.asset?._ref) {
    return undefined;
  }

  return imageBuilder.image(source).auto("format").fit("max");
};
