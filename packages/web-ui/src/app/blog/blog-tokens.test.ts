import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

const blogTokensPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "blog-tokens.css",
);

type PostcssProcessor = {
  process: (
    css: string,
    opts: { from: string },
  ) => Promise<{ css: string }>;
};

type PostcssFactory = (plugins: unknown[]) => PostcssProcessor;

const isPostcssFactory = (value: unknown): value is PostcssFactory => {
  return typeof value === "function";
};

const isTailwindPostcssFactory = (value: unknown): value is () => unknown => {
  return typeof value === "function";
};

const resolveDefaultExport = (value: unknown): unknown => {
  if (typeof value === "object" && value !== null && "default" in value) {
    return value.default;
  }
  return value;
};

describe("blog Tailwind CSS pipeline", () => {
  it("compiles blog-tokens.css into utility classes and theme fonts", async () => {
    const source = readFileSync(blogTokensPath, "utf8");

    expect(source).toContain('@import "tailwindcss"');
    expect(source).not.toContain("tailwindcss/theme");
    expect(source).not.toContain("tailwindcss/utilities");

    const postcssFactory = resolveDefaultExport(require("postcss"));
    const tailwindFactory = resolveDefaultExport(require("@tailwindcss/postcss"));

    expect(isPostcssFactory(postcssFactory)).toBe(true);
    expect(isTailwindPostcssFactory(tailwindFactory)).toBe(true);

    if (!isPostcssFactory(postcssFactory) || !isTailwindPostcssFactory(tailwindFactory)) {
      throw new Error("PostCSS pipeline dependencies are not loadable");
    }

    const result = await postcssFactory([tailwindFactory()]).process(source, {
      from: blogTokensPath,
    });

    expect(result.css).toMatch(/\.flex\s*\{/);
    expect(result.css).toMatch(/\.font-blog-display\s*\{/);
    expect(result.css).toMatch(/\.text-blog-ink\s*\{/);
    expect(result.css).not.toContain("@source");
    expect(result.css).not.toContain("@tailwind");
  });
});
