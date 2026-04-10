// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import {
  buildAssistArgsFromInputs,
  coerceAssistFieldValue,
  resolveAssistFieldType,
} from "./preview-assist-coerce.js";

describe("resolveAssistFieldType", () => {
  it("returns string when metadata omits fieldType", () => {
    expect(resolveAssistFieldType({ field: "x" })).toBe("string");
  });

  it("reads fieldType when present", () => {
    expect(resolveAssistFieldType({ fieldType: "number" })).toBe("number");
    expect(resolveAssistFieldType({ fieldType: "boolean" })).toBe("boolean");
  });

  it("accepts legacy type alias used in older snapshots", () => {
    expect(resolveAssistFieldType({ type: "number" })).toBe("number");
  });
});

describe("coerceAssistFieldValue", () => {
  it("coerces number fields", () => {
    expect(
      coerceAssistFieldValue({ fieldType: "number", raw: " 42.5 " })
    ).toBe(42.5);
    expect(coerceAssistFieldValue({ fieldType: "number", raw: "" })).toBe(
      undefined
    );
    expect(coerceAssistFieldValue({ fieldType: "number", raw: "x" })).toBe(
      undefined
    );
  });

  it("coerces string fields", () => {
    expect(coerceAssistFieldValue({ fieldType: "string", raw: " hi " })).toBe(
      "hi"
    );
    expect(coerceAssistFieldValue({ fieldType: "string", raw: "" })).toBe(
      undefined
    );
  });

  it("coerces boolean from checked", () => {
    expect(
      coerceAssistFieldValue({
        fieldType: "boolean",
        raw: "",
        checked: false,
      })
    ).toBe(false);
    expect(
      coerceAssistFieldValue({
        fieldType: "boolean",
        raw: "",
        checked: true,
      })
    ).toBe(true);
  });
});

describe("buildAssistArgsFromInputs", () => {
  it("builds typed args from form controls", () => {
    const n = document.createElement("input");
    n.type = "number";
    n.value = "10";
    const s = document.createElement("input");
    s.type = "text";
    s.value = "hello";
    const b = document.createElement("input");
    b.type = "checkbox";
    b.checked = true;
    const args = buildAssistArgsFromInputs({
      parameters: {
        count: { fieldType: "number" },
        label: { fieldType: "string" },
        flag: { fieldType: "boolean" },
      },
      keys: ["count", "label", "flag"],
      getInput: (key) =>
        ({ count: n, label: s, flag: b } as const)[
          key as "count" | "label" | "flag"
        ],
    });
    expect(args).toEqual({ count: 10, label: "hello", flag: true });
  });
});
