import { describe, it, expect } from "vitest";
import { parseReps, isCardioExercise, CARDIO_TAGS } from "../workout";

// ═══════════════════════════════════════════════════════════════════════════════
// PARSE REPS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("parseReps", () => {
  describe("simple number formats", () => {
    it("parses '10' to 10", () => {
      expect(parseReps("10")).toBe(10);
    });

    it("parses '5' to 5", () => {
      expect(parseReps("5")).toBe(5);
    });

    it("parses '15' to 15", () => {
      expect(parseReps("15")).toBe(15);
    });
  });

  describe("range formats (takes first number)", () => {
    it("parses '10-12' to 10", () => {
      expect(parseReps("10-12")).toBe(10);
    });

    it("parses '8-10' to 8", () => {
      expect(parseReps("8-10")).toBe(8);
    });

    it("parses '6-8' to 6", () => {
      expect(parseReps("6-8")).toBe(6);
    });

    it("parses '12-15' to 12", () => {
      expect(parseReps("12-15")).toBe(12);
    });
  });

  describe("timed formats", () => {
    it("parses '30s' to 30", () => {
      expect(parseReps("30s")).toBe(30);
    });

    it("parses '45s' to 45", () => {
      expect(parseReps("45s")).toBe(45);
    });

    it("parses '60sec' to 60", () => {
      expect(parseReps("60sec")).toBe(60);
    });
  });

  describe("plus notation", () => {
    it("parses '5+' to 5", () => {
      expect(parseReps("5+")).toBe(5);
    });

    it("parses '10+' to 10", () => {
      expect(parseReps("10+")).toBe(10);
    });
  });

  describe("defaults to 10 when no number found", () => {
    it("returns 10 for 'AMRAP'", () => {
      expect(parseReps("AMRAP")).toBe(10);
    });

    it("returns 10 for empty string", () => {
      expect(parseReps("")).toBe(10);
    });

    it("returns 10 for 'max'", () => {
      expect(parseReps("max")).toBe(10);
    });

    it("returns 10 for text-only input", () => {
      expect(parseReps("as many as possible")).toBe(10);
    });
  });

  describe("edge cases", () => {
    it("handles leading zeros correctly", () => {
      expect(parseReps("08-10")).toBe(8);
    });

    it("handles whitespace", () => {
      expect(parseReps(" 10 ")).toBe(10);
    });

    it("handles 'x' notation", () => {
      expect(parseReps("3x10")).toBe(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// IS CARDIO EXERCISE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("isCardioExercise", () => {
  describe("returns false for strength exercises", () => {
    it("returns false for ['strength', 'upper_body']", () => {
      expect(isCardioExercise(["strength", "upper_body"])).toBe(false);
    });

    it("returns false for ['squat', 'hinge', 'bilateral']", () => {
      expect(isCardioExercise(["squat", "hinge", "bilateral"])).toBe(false);
    });

    it("returns false for ['push', 'chest', 'horizontal']", () => {
      expect(isCardioExercise(["push", "chest", "horizontal"])).toBe(false);
    });

    it("returns false for ['pull', 'back', 'vertical']", () => {
      expect(isCardioExercise(["pull", "back", "vertical"])).toBe(false);
    });
  });

  describe("returns true for cardio exercises", () => {
    it("returns true for ['cardio']", () => {
      expect(isCardioExercise(["cardio"])).toBe(true);
    });

    it("returns true for ['conditioning']", () => {
      expect(isCardioExercise(["conditioning"])).toBe(true);
    });

    it("returns true for ['run']", () => {
      expect(isCardioExercise(["run"])).toBe(true);
    });

    it("returns true for ['sprint']", () => {
      expect(isCardioExercise(["sprint"])).toBe(true);
    });

    it("returns true for ['plyometric']", () => {
      expect(isCardioExercise(["plyometric"])).toBe(true);
    });

    it("returns true for ['jump']", () => {
      expect(isCardioExercise(["jump"])).toBe(true);
    });
  });

  describe("case insensitivity", () => {
    it("returns true for ['CARDIO'] (uppercase)", () => {
      expect(isCardioExercise(["CARDIO"])).toBe(true);
    });

    it("returns true for ['Plyometric'] (mixed case)", () => {
      expect(isCardioExercise(["Plyometric"])).toBe(true);
    });

    it("returns true for ['SPRINT'] (uppercase)", () => {
      expect(isCardioExercise(["SPRINT"])).toBe(true);
    });
  });

  describe("mixed tags (has cardio tag among others)", () => {
    it("returns true for ['cardio', 'conditioning']", () => {
      expect(isCardioExercise(["cardio", "conditioning"])).toBe(true);
    });

    it("returns true for ['plyometric', 'lower_body']", () => {
      expect(isCardioExercise(["plyometric", "lower_body"])).toBe(true);
    });

    it("returns true for ['strength', 'conditioning', 'core']", () => {
      expect(isCardioExercise(["strength", "conditioning", "core"])).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("returns false for empty array", () => {
      expect(isCardioExercise([])).toBe(false);
    });

    it("handles single non-cardio tag", () => {
      expect(isCardioExercise(["core"])).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CARDIO TAGS CONSTANT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CARDIO_TAGS", () => {
  it("contains expected cardio tags", () => {
    expect(CARDIO_TAGS).toContain("cardio");
    expect(CARDIO_TAGS).toContain("run");
    expect(CARDIO_TAGS).toContain("walk");
    expect(CARDIO_TAGS).toContain("jump");
    expect(CARDIO_TAGS).toContain("plyometric");
    expect(CARDIO_TAGS).toContain("sprint");
    expect(CARDIO_TAGS).toContain("jog");
    expect(CARDIO_TAGS).toContain("conditioning");
  });

  it("has 8 tags total", () => {
    expect(CARDIO_TAGS).toHaveLength(8);
  });
});

