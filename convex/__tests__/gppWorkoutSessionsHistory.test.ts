import { describe, it, expect } from "vitest";
import { HISTORY_STATUSES, mergeHistorySessions } from "../gppWorkoutSessions";

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY STATUS FILTER
// ═══════════════════════════════════════════════════════════════════════════════

describe("HISTORY_STATUSES", () => {
  it("includes completed and abandoned sessions", () => {
    expect(HISTORY_STATUSES).toEqual(["completed", "abandoned"]);
  });

  it("excludes in-progress sessions", () => {
    expect(HISTORY_STATUSES).not.toContain("in_progress");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MERGING PER-STATUS RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("mergeHistorySessions", () => {
  const completed = [
    { id: "c3", startedAt: 300 },
    { id: "c1", startedAt: 100 },
  ];
  const abandoned = [
    { id: "a4", startedAt: 400 },
    { id: "a2", startedAt: 200 },
  ];

  it("interleaves both lists newest first", () => {
    const merged = mergeHistorySessions([completed, abandoned], 10);
    expect(merged.map((s) => s.id)).toEqual(["a4", "c3", "a2", "c1"]);
  });

  it("caps the result at the limit, keeping the newest", () => {
    const merged = mergeHistorySessions([completed, abandoned], 3);
    expect(merged.map((s) => s.id)).toEqual(["a4", "c3", "a2"]);
  });

  it("handles one empty list", () => {
    const merged = mergeHistorySessions([completed, []], 10);
    expect(merged.map((s) => s.id)).toEqual(["c3", "c1"]);
  });

  it("returns an empty list when there is no history", () => {
    expect(mergeHistorySessions([[], []], 20)).toEqual([]);
  });

  it("does not mutate the input lists", () => {
    const input = [completed, abandoned];
    mergeHistorySessions(input, 10);
    expect(completed.map((s) => s.id)).toEqual(["c3", "c1"]);
    expect(abandoned.map((s) => s.id)).toEqual(["a4", "a2"]);
  });
});
