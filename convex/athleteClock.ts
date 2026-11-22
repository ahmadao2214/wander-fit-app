import { v } from "convex/values";

/**
 * The athlete's own day, for the server's date math.
 *
 * The calendar's helpers read dates with the runtime's local getters
 * (getDate, setHours). Convex runs in UTC, so on its own the server's
 * "today" is the UTC day, and a US athlete's evening is already tomorrow.
 * The app sends its local date and UTC offset (lib/weeksOnPlan
 * localDayArgs): "today" and the day a workout was done follow the
 * athlete's clock. The program's slot dates don't: they count from the
 * stored anchors as they always have, so a saved schedule never moves when
 * the offset changes (travel, daylight saving time). Both args are
 * optional: builds that don't send them keep the runtime's day, as before.
 */
export const athleteDayArgs = {
  /** The athlete's local date, YYYY-MM-DD. */
  today: v.optional(v.string()),
  /** Date.getTimezoneOffset() on the athlete's device. */
  timezoneOffsetMinutes: v.optional(v.number()),
};

export type AthleteDay = { today?: string; timezoneOffsetMinutes?: number };

const MS_PER_MINUTE = 60_000;

/** A timestamp as a Date whose local getters read the athlete's wall clock. */
export function athleteDate(timestamp: number, day: AthleteDay): Date {
  if (day.timezoneOffsetMinutes === undefined) return new Date(timestamp);
  const runtimeOffset = new Date(timestamp).getTimezoneOffset();
  return new Date(timestamp + (runtimeOffset - day.timezoneOffsetMinutes) * MS_PER_MINUTE);
}

/** Midnight of the athlete's today, in the runtime's local getters. */
export function athleteToday(day: AthleteDay, now: number = Date.now()): Date {
  if (day.today && /^\d{4}-\d{2}-\d{2}$/.test(day.today)) {
    const [year, month, date] = day.today.split("-").map(Number);
    return new Date(year, month - 1, date);
  }
  const local = athleteDate(now, day);
  local.setHours(0, 0, 0, 0);
  return local;
}

/** YYYY-MM-DD of a Date, read with local getters. */
export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${dayOfMonth}`;
}
