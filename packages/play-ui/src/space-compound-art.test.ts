import { describe, expect, it } from "vitest";
import {
  countAmenitiesInSpaceCompound,
  representativePrimaryAmenityForCompound,
} from "./space-compound-art.js";

describe("space-compound-art", () => {
  describe("countAmenitiesInSpaceCompound", () => {
    it("counts unique amenities across primary and list fields", () => {
      expect(
        countAmenitiesInSpaceCompound([
          { amenities: ["bakery", "deli"], primaryAmenity: "supermarket" },
        ])
      ).toBe(3);
    });

    it("deduplicates the same amenity id", () => {
      expect(
        countAmenitiesInSpaceCompound([
          { amenities: ["a", "a", "b"] },
        ])
      ).toBe(2);
    });

    it("falls back to structure count when no amenity metadata", () => {
      expect(countAmenitiesInSpaceCompound([{}, {}])).toBe(2);
    });

    it("returns zero for an empty group", () => {
      expect(countAmenitiesInSpaceCompound([])).toBe(0);
    });
  });

  describe("representativePrimaryAmenityForCompound", () => {
    it("prefers supermarket when any member has it", () => {
      expect(
        representativePrimaryAmenityForCompound([
          { primaryAmenity: "shop" },
          { primaryAmenity: "supermarket" },
        ])
      ).toBe("supermarket");
    });

    it("prefers car_wash when present and no supermarket", () => {
      expect(
        representativePrimaryAmenityForCompound([
          { primaryAmenity: "shop" },
          { primaryAmenity: "car_wash" },
        ])
      ).toBe("car_wash");
    });

    it("defaults to shop when no primary is set", () => {
      expect(representativePrimaryAmenityForCompound([{}])).toBe("shop");
    });
  });
});
