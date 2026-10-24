import { describe, expect, it } from "vitest";
import { resolveEquipmentModePreference } from "../userPrograms";
import { resolveSessionEquipmentMode } from "../gppWorkoutSessions";

describe("equipment mode preference helpers", () => {
  describe("resolveEquipmentModePreference", () => {
    it("defaults to gym when unset", () => {
      expect(resolveEquipmentModePreference(undefined)).toBe("gym");
      expect(resolveEquipmentModePreference(null)).toBe("gym");
    });

    it("returns the stored preference when present", () => {
      expect(resolveEquipmentModePreference("gym")).toBe("gym");
      expect(resolveEquipmentModePreference("home")).toBe("home");
    });
  });

  describe("resolveSessionEquipmentMode", () => {
    it("uses the explicitly requested mode when provided", () => {
      expect(resolveSessionEquipmentMode("home", "gym")).toBe("home");
      expect(resolveSessionEquipmentMode("gym", "home")).toBe("gym");
    });

    it("falls back to the stored program mode when request is missing", () => {
      expect(resolveSessionEquipmentMode(undefined, "home")).toBe("home");
    });

    it("defaults to gym when neither value is present", () => {
      expect(resolveSessionEquipmentMode(undefined, undefined)).toBe("gym");
      expect(resolveSessionEquipmentMode(null, null)).toBe("gym");
    });
  });
});
