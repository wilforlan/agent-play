import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const postcss = require("postcss") as typeof import("postcss");
const tailwindcssPostcss = require("@tailwindcss/postcss") as () => import("postcss").AcceptedPlugin;

const blogTokensPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "blog-tokens.css",
);

describe("blog Tailwind CSS pipeline", () => {
  it("compiles blog-tokens.css into utility classes and theme fonts", async () => {
    const source = readFileSync(blogTokensPath, "utf8");

    expect(source).toContain('@import "tailwindcss"');
    expect(source).not.toContain("tailwindcss/theme");
    expect(source).not.toContain("tailwindcss/utilities");

    const result = await postcss([tailwindcssPostcss()]).process(source, {
      from: blogTokensPath,
    });

    expect(result.css).toMatch(/\.flex\s*\{/);
    expect(result.css).toMatch(/\.font-blog-display\s*\{/);
    expect(result.css).toMatch(/\.text-blog-ink\s*\{/);
    expect(result.css).not.toContain("@source");
    expect(result.css).not.toContain("@tailwind");
  });
});
