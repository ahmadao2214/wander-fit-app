export const testNames = { tryout: 'Team tryout', beep: 'Beep test', mile: '1.5-mile run', academy: 'Academy trial', none: 'No date yet' };

export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function daysUntil(value, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (dateKey(parsed) !== value) return null;
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
}

export function buildPlan(days, experience) {
  if (days === null || days < 1) return null;
  const weeks = Math.floor(days / 7);
  if (weeks < 2) return { weeks, sessions: 0, phases: [{ name: 'Preparation', weeks: 1 }], message: 'A short runway. This preview won’t promise new strength before test day. Ask your coach how to arrive rested and ready.' };
  const technique = Math.min(experience === 'never' ? 2 : experience === 'some' ? 1 : 0, Math.max(0, weeks - 2));
  const peak = weeks >= 4 ? 1 : 0;
  const build = weeks - technique - peak - 1;
  const phases = [{ name: 'Technique', weeks: technique }, { name: 'Build', weeks: build }, { name: 'Peak', weeks: peak }, { name: 'Taper', weeks: 1 }].filter(phase => phase.weeks > 0);
  return { weeks, sessions: weeks * 3, phases, message: experience === 'never' ? 'Learn the movements first. Build steadily, then ease off before test day. The actual plan needs your coach’s input.' : 'Build on your experience, with a lighter final week before the test. This is an illustration, not a prescribed program.' };
}

// How many weeks the calendar shows, starting with the current week.
// Later dates go through the date picker under it.
export const CALENDAR_WEEKS = 14;

// Phase for each day between today (day 0) and the test (day `days`).
// Returns an array indexed by day offset 1..days-1; index 0 and `days` are unused.
export function dayPhases(days, experience) {
  const plan = buildPlan(days, experience);
  if (!plan) return [];
  const out = new Array(days).fill(null);
  if (plan.weeks < 2) {
    for (let k = 1; k < days; k++) out[k] = 'taper';
    return out;
  }
  const weeksOf = name => plan.phases.find(p => p.name === name)?.weeks ?? 0;
  const techniqueEnd = weeksOf('Technique') * 7;
  const taperStart = days - 7;
  const peakStart = taperStart - weeksOf('Peak') * 7;
  for (let k = 1; k < days; k++) {
    out[k] = k <= techniqueEnd ? 'technique' : k >= taperStart ? 'taper' : k >= peakStart ? 'peak' : 'build';
  }
  return out;
}

// Lifting days: Mon/Wed/Fri while building, Monday only in the taper week.
export function isLiftDay(phase, weekday) {
  if (!phase) return false;
  if (phase === 'taper') return weekday === 1;
  return weekday === 1 || weekday === 3 || weekday === 5;
}
