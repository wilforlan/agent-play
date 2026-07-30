import { describe, expect, it } from "vitest";

import { formatBlogPublishedAt, getTitleInitials } from "./blog-format";

describe("formatBlogPublishedAt", () => {
  it("formats ISO dates for the newsroom", () => {
    expect(formatBlogPublishedAt("2026-04-28T18:00:00.000Z")).toBe("28 April 2026");
  });

  it("returns Draft when publishedAt is missing", () => {
    expect(formatBlogPublishedAt(null)).toBe("Draft");
  });
});

describe("getTitleInitials", () => {
  it("derives two-letter avatar initials from the first two title words", () => {
    expect(getTitleInitials("Chat with HR")).toBe("CW");
    expect(getTitleInitials("Meeting Legal")).toBe("ML");
    expect(getTitleInitials("Solo")).toBe("SO");
    expect(getTitleInitials("  spaced   words  ")).toBe("SW");
    expect(getTitleInitials("")).toBe("?");
  });
});
