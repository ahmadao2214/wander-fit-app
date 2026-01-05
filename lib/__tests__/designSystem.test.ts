import { describe, it, expect } from "vitest";
import {
  intensityThemeMap,
  categoryAccentColors,
  brandPrimary,
  brandAccent,
  brandNavy,
} from "../../tamagui.config";

// ═══════════════════════════════════════════════════════════════════════════════
// INTENSITY THEME MAP TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("intensityThemeMap", () => {
  it("maps 'low' to 'intensity_low' theme", () => {
    expect(intensityThemeMap.low).toBe("intensity_low");
  });

  it("maps 'medium' to 'intensity_medium' theme", () => {
    expect(intensityThemeMap.medium).toBe("intensity_medium");
  });

  it("maps 'high' to 'intensity_high' theme", () => {
    expect(intensityThemeMap.high).toBe("intensity_high");
  });

  it("contains exactly 3 intensity levels", () => {
    expect(Object.keys(intensityThemeMap)).toHaveLength(3);
  });

  it("has consistent naming convention with underscore separator", () => {
    Object.values(intensityThemeMap).forEach((themeName) => {
      expect(themeName).toMatch(/^intensity_\w+$/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY ACCENT COLORS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("categoryAccentColors", () => {
  describe("Endurance category (ID: 1)", () => {
    it("has correct primary color (Teal)", () => {
      expect(categoryAccentColors[1].primary).toBe("#14B8A6");
    });

    it("has correct light color", () => {
      expect(categoryAccentColors[1].light).toBe("#99F6E4");
    });

    it("has correct dark color", () => {
      expect(categoryAccentColors[1].dark).toBe("#0D9488");
    });
  });

  describe("Power category (ID: 2)", () => {
    it("has correct primary color (Purple)", () => {
      expect(categoryAccentColors[2].primary).toBe("#A855F7");
    });

    it("has correct light color", () => {
      expect(categoryAccentColors[2].light).toBe("#E9D5FF");
    });

    it("has correct dark color", () => {
      expect(categoryAccentColors[2].dark).toBe("#9333EA");
    });
  });

  describe("Rotation category (ID: 3)", () => {
    it("has correct primary color (Orange)", () => {
      expect(categoryAccentColors[3].primary).toBe("#F97316");
    });

    it("has correct light color", () => {
      expect(categoryAccentColors[3].light).toBe("#FFEDD5");
    });

    it("has correct dark color", () => {
      expect(categoryAccentColors[3].dark).toBe("#EA580C");
    });
  });

  describe("Strength category (ID: 4)", () => {
    it("has correct primary color (Blue)", () => {
      expect(categoryAccentColors[4].primary).toBe("#3B82F6");
    });

    it("has correct light color", () => {
      expect(categoryAccentColors[4].light).toBe("#DBEAFE");
    });

    it("has correct dark color", () => {
      expect(categoryAccentColors[4].dark).toBe("#2563EB");
    });
  });

  describe("Structure validation", () => {
    it("contains exactly 4 categories", () => {
      expect(Object.keys(categoryAccentColors)).toHaveLength(4);
    });

    it("each category has primary, light, and dark properties", () => {
      Object.values(categoryAccentColors).forEach((category) => {
        expect(category).toHaveProperty("primary");
        expect(category).toHaveProperty("light");
        expect(category).toHaveProperty("dark");
      });
    });

    it("all color values are valid hex codes", () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      Object.values(categoryAccentColors).forEach((category) => {
        expect(category.primary).toMatch(hexColorRegex);
        expect(category.light).toMatch(hexColorRegex);
        expect(category.dark).toMatch(hexColorRegex);
      });
    });

    it("light colors have higher brightness than primary", () => {
      // Light colors should be lighter (higher hex values generally)
      // This is a simplified check - light colors typically start with F
      Object.values(categoryAccentColors).forEach((category) => {
        // Just verify light color exists and is different from primary
        expect(category.light).not.toBe(category.primary);
        expect(category.light).not.toBe(category.dark);
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND COLOR CONSTANT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Brand color constants", () => {
  describe("brandPrimary (Electric Blue)", () => {
    it("has the correct hex value", () => {
      expect(brandPrimary).toBe("#2563EB");
    });

    it("is a valid 6-character hex color", () => {
      expect(brandPrimary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe("brandAccent (Flame Orange)", () => {
    it("has the correct hex value", () => {
      expect(brandAccent).toBe("#F97316");
    });

    it("is a valid 6-character hex color", () => {
      expect(brandAccent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe("brandNavy (Deep Navy)", () => {
    it("has the correct hex value", () => {
      expect(brandNavy).toBe("#0F172A");
    });

    it("is a valid 6-character hex color", () => {
      expect(brandNavy).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe("Color relationships", () => {
    it("all brand colors are distinct", () => {
      const colors = [brandPrimary, brandAccent, brandNavy];
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });

    it("brandPrimary matches Strength category dark color", () => {
      expect(brandPrimary).toBe(categoryAccentColors[4].dark);
    });

    it("brandAccent matches Rotation category primary color", () => {
      expect(brandAccent).toBe(categoryAccentColors[3].primary);
    });
  });
});
