import { describe, it, expect } from "vitest";
import { getExperienceSliderColor, getSportInitials } from "../intakeUI";

// ═══════════════════════════════════════════════════════════════════════════════
// EXPERIENCE SLIDER COLOR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getExperienceSliderColor", () => {
  describe("Low intensity (0-3 years) - Green", () => {
    it("returns $intensityLow6 for 0 years of experience", () => {
      expect(getExperienceSliderColor(0)).toBe("$intensityLow6");
    });

    it("returns $intensityLow6 for 1 year of experience", () => {
      expect(getExperienceSliderColor(1)).toBe("$intensityLow6");
    });

    it("returns $intensityLow6 for 2 years of experience", () => {
      expect(getExperienceSliderColor(2)).toBe("$intensityLow6");
    });

    it("returns $intensityLow6 for exactly 3 years (boundary)", () => {
      expect(getExperienceSliderColor(3)).toBe("$intensityLow6");
    });

    it("returns $intensityLow6 for negative years (edge case)", () => {
      expect(getExperienceSliderColor(-1)).toBe("$intensityLow6");
      expect(getExperienceSliderColor(-5)).toBe("$intensityLow6");
    });

    it("returns $intensityLow6 for decimal values below 3", () => {
      expect(getExperienceSliderColor(0.5)).toBe("$intensityLow6");
      expect(getExperienceSliderColor(2.9)).toBe("$intensityLow6");
    });
  });

  describe("Medium intensity (4-6 years) - Amber", () => {
    it("returns $intensityMed6 for 4 years of experience (boundary)", () => {
      expect(getExperienceSliderColor(4)).toBe("$intensityMed6");
    });

    it("returns $intensityMed6 for 5 years of experience", () => {
      expect(getExperienceSliderColor(5)).toBe("$intensityMed6");
    });

    it("returns $intensityMed6 for exactly 6 years (boundary)", () => {
      expect(getExperienceSliderColor(6)).toBe("$intensityMed6");
    });

    it("returns $intensityMed6 for decimal values in 4-6 range", () => {
      expect(getExperienceSliderColor(3.1)).toBe("$intensityMed6");
      expect(getExperienceSliderColor(4.5)).toBe("$intensityMed6");
      expect(getExperienceSliderColor(5.9)).toBe("$intensityMed6");
    });
  });

  describe("High intensity (7+ years) - Red", () => {
    it("returns $intensityHigh6 for 7 years of experience (boundary)", () => {
      expect(getExperienceSliderColor(7)).toBe("$intensityHigh6");
    });

    it("returns $intensityHigh6 for 8 years of experience", () => {
      expect(getExperienceSliderColor(8)).toBe("$intensityHigh6");
    });

    it("returns $intensityHigh6 for 10 years of experience (max slider)", () => {
      expect(getExperienceSliderColor(10)).toBe("$intensityHigh6");
    });

    it("returns $intensityHigh6 for values above 10", () => {
      expect(getExperienceSliderColor(15)).toBe("$intensityHigh6");
      expect(getExperienceSliderColor(20)).toBe("$intensityHigh6");
    });

    it("returns $intensityHigh6 for decimal values in 7+ range", () => {
      expect(getExperienceSliderColor(6.1)).toBe("$intensityHigh6");
      expect(getExperienceSliderColor(7.5)).toBe("$intensityHigh6");
      expect(getExperienceSliderColor(9.9)).toBe("$intensityHigh6");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPORT INITIALS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getSportInitials", () => {
  describe("Single word sport names", () => {
    // For single words, the algorithm takes first letter of each word,
    // so single word sports get only 1 initial
    it("returns single initial for 'Soccer'", () => {
      expect(getSportInitials("Soccer")).toBe("S");
    });

    it("returns single initial for 'Basketball'", () => {
      expect(getSportInitials("Basketball")).toBe("B");
    });

    it("returns single initial for 'Tennis'", () => {
      expect(getSportInitials("Tennis")).toBe("T");
    });

    it("returns single letter for single letter name", () => {
      expect(getSportInitials("A")).toBe("A");
    });

    it("returns single letter for two letter name (only first letter)", () => {
      expect(getSportInitials("Go")).toBe("G");
    });
  });

  describe("Multi-word sport names", () => {
    it("returns first letters of each word for 'Ice Hockey'", () => {
      expect(getSportInitials("Ice Hockey")).toBe("IH");
    });

    it("returns first two word initials for 'American Football'", () => {
      expect(getSportInitials("American Football")).toBe("AF");
    });

    it("limits to 2 characters for names with 3+ words", () => {
      expect(getSportInitials("Track and Field")).toBe("TA");
    });

    it("handles 'Cross Country Running'", () => {
      expect(getSportInitials("Cross Country Running")).toBe("CC");
    });
  });

  describe("Names with parentheses", () => {
    it("handles 'Basketball (Women)'", () => {
      expect(getSportInitials("Basketball (Women)")).toBe("BW");
    });

    it("handles 'Soccer (Men)'", () => {
      expect(getSportInitials("Soccer (Men)")).toBe("SM");
    });

    it("handles 'Track (Indoor)'", () => {
      expect(getSportInitials("Track (Indoor)")).toBe("TI");
    });
  });

  describe("Names with forward slashes", () => {
    it("handles 'Track/Field'", () => {
      expect(getSportInitials("Track/Field")).toBe("TF");
    });

    it("handles 'Swimming/Diving'", () => {
      expect(getSportInitials("Swimming/Diving")).toBe("SD");
    });
  });

  describe("Edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(getSportInitials("")).toBe("");
    });

    it("returns empty string for whitespace only", () => {
      expect(getSportInitials("   ")).toBe("");
    });

    it("handles multiple consecutive spaces", () => {
      expect(getSportInitials("Ice   Hockey")).toBe("IH");
    });

    it("handles leading/trailing spaces (single word)", () => {
      expect(getSportInitials("  Soccer  ")).toBe("S");
    });

    it("handles numbers at start of words (filters them out)", () => {
      expect(getSportInitials("100 Meter Dash")).toBe("MD");
    });

    it("handles mixed alphanumeric where number forms first 'word'", () => {
      // "5K" splits to "5K" as one word, first char is "5" which is filtered
      // "Running" gives "R"
      expect(getSportInitials("5K Running")).toBe("R");
    });

    it("uppercases lowercase input (single word)", () => {
      expect(getSportInitials("soccer")).toBe("S");
    });

    it("handles mixed case input", () => {
      expect(getSportInitials("iCe hOcKeY")).toBe("IH");
    });
  });

  describe("Complex separator combinations", () => {
    it("handles 'Track (Outdoor)/Field'", () => {
      expect(getSportInitials("Track (Outdoor)/Field")).toBe("TO");
    });

    it("handles 'Swimming (Men/Women)'", () => {
      expect(getSportInitials("Swimming (Men/Women)")).toBe("SM");
    });
  });
});
