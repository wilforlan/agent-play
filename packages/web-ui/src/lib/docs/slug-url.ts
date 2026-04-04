const SAFE_SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

export function slugSegmentIsSafe(segment: string): boolean {
  return SAFE_SEGMENT.test(segment) && !segment.includes("..");
}

export function relativeMdToUrlSlugSegments(relativeMd: string): string[] {
  const n = relativeMd.replace(/\\/g, "/");
  if (n === "README.md") {
    return [];
  }
  if (n.endsWith("/README.md")) {
    const dir = n.slice(0, -"/README.md".length);
    return dir.split("/").filter(Boolean);
  }
  if (!n.endsWith(".md")) {
    return [];
  }
  const without = n.slice(0, -3);
  return without.split("/").filter(Boolean);
}

export function urlSlugSegmentsToDefaultMdPath(segments: string[]): string {
  if (segments.length === 0) {
    return "README.md";
  }
  return `${segments.join("/")}.md`;
}
