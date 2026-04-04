import { describe, expect, it } from "vitest";
import {
  relativeMdToUrlSlugSegments,
  slugSegmentIsSafe,
  urlSlugSegmentsToDefaultMdPath,
} from "./slug-url";

describe("doc path mapping", () => {
  it("maps root README to empty slug", () => {
    expect(relativeMdToUrlSlugSegments("README.md")).toEqual([]);
  });

  it("maps nested readme to single segment folder", () => {
    expect(relativeMdToUrlSlugSegments("k8s/README.md")).toEqual(["k8s"]);
  });

  it("maps nested file to slug segments", () => {
    expect(relativeMdToUrlSlugSegments("k8s/startup.md")).toEqual([
      "k8s",
      "startup",
    ]);
  });

  it("round-trips file slug to default md path", () => {
    expect(urlSlugSegmentsToDefaultMdPath([])).toBe("README.md");
    expect(urlSlugSegmentsToDefaultMdPath(["k8s", "startup"])).toBe(
      "k8s/startup.md",
    );
  });

  it("rejects unsafe slug segments", () => {
    expect(slugSegmentIsSafe("..")).toBe(false);
    expect(slugSegmentIsSafe("a/b")).toBe(false);
    expect(slugSegmentIsSafe("ok")).toBe(true);
    expect(slugSegmentIsSafe("k8s-deployment")).toBe(true);
  });
});
