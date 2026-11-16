import { calendarStart, phaseAnchor, scheduleStart, slotOnDate } from "../blockCompletion";

const DAY = 24 * 60 * 60 * 1000;
const createdAt = new Date(2026, 8, 1).getTime();

describe("calendar anchors", () => {
  it("an on-time program counts every phase from createdAt", () => {
    const program = { currentPhase: "SPP", phaseStartDate: createdAt + 28 * DAY, createdAt, weeksPerPhase: 4 };
    for (const phase of ["GPP", "SPP", "SSP"]) {
      expect({ phase, at: phaseAnchor(program, phase).getTime() }).toEqual({ phase, at: createdAt });
    }
  });

  it("a late phase moves itself and later phases, not past ones", () => {
    const program = { currentPhase: "SPP", phaseStartDate: createdAt + 42 * DAY, createdAt, weeksPerPhase: 4 };
    expect(phaseAnchor(program, "GPP").getTime()).toBe(createdAt);
    expect(phaseAnchor(program, "SPP").getTime()).toBe(createdAt + 14 * DAY);
    expect(phaseAnchor(program, "SSP").getTime()).toBe(createdAt + 14 * DAY);
    expect(calendarStart(program).getTime()).toBe(createdAt);
  });

  it("an early phase pulls past phases back, so they don't overlap it", () => {
    const program = { currentPhase: "SPP", phaseStartDate: createdAt + 21 * DAY, createdAt, weeksPerPhase: 4 };
    expect(phaseAnchor(program, "GPP").getTime()).toBe(scheduleStart(program).getTime());
    expect(calendarStart(program).getTime()).toBe(createdAt - 7 * DAY);
  });

  it("reads a date with the anchor that owns its phase", () => {
    const program = { currentPhase: "SPP", phaseStartDate: createdAt + 42 * DAY, createdAt, weeksPerPhase: 4 };
    // From the SPP anchor this date is still GPP; only the GPP anchor may answer
    const find = (anchor: Date) =>
      anchor.getTime() === createdAt ? { phase: "GPP", week: 4 } : { phase: "GPP", week: 2 };
    expect(slotOnDate(program, find)).toEqual({ phase: "GPP", week: 4 });
    expect(slotOnDate(program, () => null)).toBeNull();
  });
});
