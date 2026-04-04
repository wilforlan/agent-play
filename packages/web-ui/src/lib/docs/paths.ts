import { join } from "node:path";

export function getDocsRoot(): string {
  return join(process.cwd(), "content", "docs");
}

export {
  relativeMdToUrlSlugSegments,
  slugSegmentIsSafe,
  urlSlugSegmentsToDefaultMdPath,
} from "./slug-url";
