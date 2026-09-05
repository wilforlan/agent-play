import { describe, expect, it } from "vitest";
import { visiblePageNumbers } from "./scanner-pagination.js";

describe("visiblePageNumbers", () => {
  it("lists every page when the range is short", () => {
    expect(visiblePageNumbers({ page: 2, pageCount: 5 })).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("keeps first, last, and a window around the current page", () => {
    expect(visiblePageNumbers({ page: 1, pageCount: 12 })).toEqual([
      1, 2, 3, "ellipsis", 12,
    ]);
    expect(visiblePageNumbers({ page: 6, pageCount: 12 })).toEqual([
      1, "ellipsis", 5, 6, 7, "ellipsis", 12,
    ]);
    expect(visiblePageNumbers({ page: 12, pageCount: 12 })).toEqual([
      1, "ellipsis", 10, 11, 12,
    ]);
  });

  it("returns an empty list when there are no pages", () => {
    expect(visiblePageNumbers({ page: 1, pageCount: 0 })).toEqual([]);
  });
});
