// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { buildCarSprite, parseHexColor } from "./sprite-car.js";

describe("sprite-car: parseHexColor", () => {
  it("parses 6-digit hex strings prefixed with #", () => {
    expect(parseHexColor("#ff0000")).toBe(0xff0000);
    expect(parseHexColor("#0a0b0c")).toBe(0x0a0b0c);
  });

  it("parses 6-digit hex strings without a prefix", () => {
    expect(parseHexColor("123abc")).toBe(0x123abc);
  });

  it("falls back to red for malformed input", () => {
    expect(parseHexColor("invalid")).toBe(0xcc0000);
  });
});

describe("sprite-car: buildCarSprite", () => {
  it("builds a container with body, windshield, and wheels", () => {
    const sprite = buildCarSprite({
      colorHex: "#ff0000",
      model: "Sport Coupe",
      sold: false,
    });
    expect(sprite.children.length).toBeGreaterThanOrEqual(3);
  });

  it("appends the SOLD overlay when sold", () => {
    const available = buildCarSprite({
      colorHex: "#ff0000",
      model: "Coupe",
      sold: false,
    });
    const sold = buildCarSprite({
      colorHex: "#ff0000",
      model: "Coupe",
      sold: true,
    });
    expect(sold.children.length).toBeGreaterThan(available.children.length);
  });
});
