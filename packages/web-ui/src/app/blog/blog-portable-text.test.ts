/** @vitest-environment happy-dom */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  BlogPortableText,
  resolvePortableTextLinkHref,
  toPortableTextBlocks,
} from "./blog-portable-text";

describe("toPortableTextBlocks", () => {
  it("keeps typed blocks and drops invalid entries", () => {
    const blocks = toPortableTextBlocks([
      { _type: "block", _key: "a", children: [] },
      null,
      "skip",
      { _type: "image", _key: "b" },
    ]);

    expect(blocks).toEqual([
      { _type: "block", _key: "a", children: [] },
      { _type: "image", _key: "b" },
    ]);
  });
});

describe("resolvePortableTextLinkHref", () => {
  it("prefers href from mark definition", () => {
    expect(
      resolvePortableTextLinkHref({
        value: { href: "https://agent-play.com/doc" },
      }),
    ).toBe("https://agent-play.com/doc");
  });

  it("returns hash when href is missing", () => {
    expect(resolvePortableTextLinkHref({ value: {} })).toBe("#");
  });

  it("rejects javascript urls", () => {
    expect(
      resolvePortableTextLinkHref({
        value: { href: "javascript:alert(1)" },
      }),
    ).toBe("#");
  });
});

describe("BlogPortableText", () => {
  it("renders bold, italic, links, lists, and headings", () => {
    const markup = renderToStaticMarkup(
      React.createElement(BlogPortableText, {
        value: [
          {
            _type: "block",
            _key: "h2",
            style: "h2",
            markDefs: [],
            children: [{ _type: "span", _key: "s1", text: "Heading two", marks: [] }],
          },
          {
            _type: "block",
            _key: "p1",
            style: "normal",
            markDefs: [{ _type: "link", _key: "l1", href: "https://example.com" }],
            children: [
              { _type: "span", _key: "s2", text: "Bold ", marks: ["strong"] },
              { _type: "span", _key: "s3", text: "italic ", marks: ["em"] },
              { _type: "span", _key: "s4", text: "link", marks: ["l1"] },
            ],
          },
          {
            _type: "block",
            _key: "li1",
            style: "normal",
            listItem: "bullet",
            level: 1,
            markDefs: [],
            children: [{ _type: "span", _key: "s5", text: "Bullet one", marks: [] }],
          },
          {
            _type: "block",
            _key: "li2",
            style: "normal",
            listItem: "number",
            level: 1,
            markDefs: [],
            children: [{ _type: "span", _key: "s6", text: "Number one", marks: [] }],
          },
        ],
      }),
    );

    expect(markup).toContain("<h2");
    expect(markup).toContain("Heading two");
    expect(markup).toContain("<strong");
    expect(markup).toContain("<em");
    expect(markup).toContain('href="https://example.com"');
    expect(markup).toContain("<ul");
    expect(markup).toContain("<ol");
    expect(markup).toContain("Bullet one");
    expect(markup).toContain("Number one");
  });
});
