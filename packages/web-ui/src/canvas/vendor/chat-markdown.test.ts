// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderChatMarkdown } from "./chat-markdown.js";

describe("renderChatMarkdown", () => {
  it("keeps headings and emphasis for lesson-style markdown", () => {
    const html = renderChatMarkdown(
      "## Why this lesson matters\n\nContour and **negative space**."
    );
    expect(html).toContain("<h2>");
    expect(html).toContain("Why this lesson matters");
    expect(html).toContain("<strong>negative space</strong>");
  });

  it("drops script tags from markdown HTML", () => {
    const html = renderChatMarkdown(
      'Hello <script>alert("x")</script> **world**'
    );
    expect(html.toLowerCase()).not.toContain("<script");
    expect(html).toContain("<strong>world</strong>");
  });
});
