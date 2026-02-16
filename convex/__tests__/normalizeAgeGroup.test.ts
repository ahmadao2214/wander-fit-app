import { describe, it, expect } from "vitest";
import { normalizeAgeGroup } from "../intensityScaling";

describe("normalizeAgeGroup", () => {
  describe("current valid values pass through unchanged", () => {
    it("returns '14-17' for '14-17'", () => {
      expect(normalizeAgeGroup("14-17")).toBe("14-17");
    });

    it("returns '18-35' for '18-35'", () => {
      expect(normalizeAgeGroup("18-35")).toBe("18-35");
    });

    it("returns '36+' for '36+'", () => {
      expect(normalizeAgeGroup("36+")).toBe("36+");
    });
  });

  describe("legacy values are mapped correctly", () => {
    it("maps '10-13' to '14-17'", () => {
      expect(normalizeAgeGroup("10-13")).toBe("14-17");
    });

    it("maps '18+' to '18-35'", () => {
      expect(normalizeAgeGroup("18+")).toBe("18-35");
    });
  });

  describe("null/undefined defaults to '18-35'", () => {
    it("returns '18-35' for null", () => {
      expect(normalizeAgeGroup(null)).toBe("18-35");
    });

    it("returns '18-35' for undefined", () => {
      expect(normalizeAgeGroup(undefined)).toBe("18-35");
    });
  });

  describe("unknown values default to '18-35'", () => {
    it("returns '18-35' for unknown string", () => {
      expect(normalizeAgeGroup("unknown")).toBe("18-35");
    });

    it("returns '18-35' for empty string", () => {
      expect(normalizeAgeGroup("")).toBe("18-35");
    });
  });
});
