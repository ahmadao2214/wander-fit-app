import { anchorsAfterCheckIn, calendarStart, phaseAnchor, slotOnDate } from "../blockCompletion";

const DAY = 24 * 60 * 60 * 1000;
const createdAt = new Date(2026, 0, 5).getTime();
const at = (phase: string, program: Parameters<typeof phaseAnchor>[0]) => phaseAnchor(program, phase).getTime();

describe("calendar anchors", () => {
  it("a program with no check-in yet counts every phase from createdAt", () => {
    const program = { currentPhase: "GPP", createdAt };
    for (const phase of ["GPP", "SPP", "SSP"]) {
      expect({ phase, at: at(phase, program) }).toEqual({ phase, at: createdAt });
    }
  });

  it("an on-time check-in keeps every anchor at createdAt", () => {
    const anchors = anchorsAfterCheckIn({ currentPhase: "GPP", createdAt }, "SPP", createdAt + 28 * DAY, 4);
    expect(anchors).toEqual({ GPP: createdAt, SPP: createdAt, SSP: createdAt });
  });

  // Sol review on #120: a late phase keeps its dates once it is past
  it("a late SPP keeps its dates after moving on to SSP", () => {
    const gpp = { currentPhase: "GPP", createdAt };
    // SPP starts two weeks late
    const spp = { currentPhase: "SPP", createdAt, calendarAnchors: anchorsAfterCheckIn(gpp, "SPP", createdAt + 42 * DAY, 4) };
    expect(at("GPP", spp)).toBe(createdAt);
    expect(at("SPP", spp)).toBe(createdAt + 14 * DAY);
    // SSP starts on time after SPP
    const ssp = { currentPhase: "SSP", createdAt, calendarAnchors: anchorsAfterCheckIn(spp, "SSP", createdAt + 70 * DAY, 4) };
    expect(at("GPP", ssp)).toBe(createdAt);
    expect(at("SPP", ssp)).toBe(createdAt + 14 * DAY);
    expect(at("SSP", ssp)).toBe(createdAt + 14 * DAY);
  });

  // Sol review on #120: phases never share dates
  it("an early SPP follows GPP instead of overlapping it", () => {
    const gpp = { currentPhase: "GPP", createdAt };
    const spp = { currentPhase: "SPP", createdAt, calendarAnchors: anchorsAfterCheckIn(gpp, "SPP", createdAt + 21 * DAY, 4) };
    expect(at("GPP", spp)).toBe(createdAt);
    expect(at("SPP", spp)).toBe(createdAt);
    expect(calendarStart(spp).getTime()).toBe(createdAt);
  });

  it("a new cycle after SSP moves every phase", () => {
    const ssp = { currentPhase: "SSP", createdAt };
    const anchors = anchorsAfterCheckIn(ssp, "GPP", createdAt + 90 * DAY, 4);
    expect(anchors).toEqual({ GPP: createdAt + 90 * DAY, SPP: createdAt + 90 * DAY, SSP: createdAt + 90 * DAY });
  });

  it("reads a date with the anchor that owns its phase, current phase first", () => {
    const program = { currentPhase: "SPP", createdAt, calendarAnchors: { GPP: createdAt, SPP: createdAt + 14 * DAY, SSP: createdAt + 14 * DAY } };
    // From the SPP anchor this date is still GPP; only the GPP anchor may answer
    const find = (anchor: Date) =>
      anchor.getTime() === createdAt ? { phase: "GPP", week: 4 } : { phase: "GPP", week: 2 };
    expect(slotOnDate(program, find)).toEqual({ phase: "GPP", week: 4 });
    // Where both own the date, the current phase wins
    const both = (anchor: Date) => (anchor.getTime() === createdAt ? { phase: "GPP" } : { phase: "SPP" });
    expect(slotOnDate(program, both)).toEqual({ phase: "SPP" });
    expect(slotOnDate(program, () => null)).toBeNull();
  });
});
