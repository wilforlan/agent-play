import { describe, expect, it } from "vitest";

import post from "./post";

describe("post schema", () => {
  it("includes categories field referencing category documents", () => {
    const categoriesField = post.fields.find((field) => field.name === "categories");

    expect(categoriesField).toBeDefined();
    expect(categoriesField?.type).toBe("array");

    const firstType = categoriesField?.of?.[0];
    expect(firstType?.type).toBe("reference");
    expect(firstType?.to?.[0]?.type).toBe("category");
  });

  it("includes featured toggle field", () => {
    const featuredField = post.fields.find((field) => field.name === "featured");

    expect(featuredField).toBeDefined();
    expect(featuredField?.type).toBe("boolean");
  });
});
