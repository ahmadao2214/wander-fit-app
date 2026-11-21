import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPlan, daysUntil } from './plan.mjs';

test('date math uses calendar days across daylight-saving boundaries', () => {
  assert.equal(daysUntil('2026-11-02', new Date(2026, 9, 31)), 2);
  assert.equal(daysUntil('2027-03-15', new Date(2027, 2, 13)), 2);
});
test('invalid and past dates cannot create a plan', () => {
  for (const value of ['', '2026-02-30', 'not-a-date']) assert.equal(daysUntil(value), null);
  assert.equal(buildPlan(null, 'never'), null);
  assert.equal(buildPlan(-1, 'never'), null);
  assert.equal(buildPlan(0, 'never'), null);
});
test('a six-week beginner preview accounts for every week', () => {
  const plan = buildPlan(42, 'never');
  assert.equal(plan.weeks, 6);
  assert.equal(plan.sessions, 18);
  assert.deepEqual(plan.phases.map(phase => phase.weeks), [2, 2, 1, 1]);
});
test('experience changes technique time without changing the deadline', () => {
  for (const experience of ['never', 'some', 'regular']) {
    for (let days = 14; days <= 730; days++) {
      const plan = buildPlan(days, experience);
      assert.equal(plan.phases.reduce((sum, phase) => sum + phase.weeks, 0), plan.weeks);
      assert.ok(plan.phases.every(phase => phase.weeks > 0));
      assert.equal(plan.phases.at(-1).name, 'Taper');
    }
  }
});
test('near-term tests do not promise strength gains or lifting sessions', () => {
  assert.equal(buildPlan(6, 'never').sessions, 0);
  assert.equal(buildPlan(13, 'regular').phases[0].name, 'Preparation');
});

import { dayPhases, isLiftDay } from './plan.mjs';

test('calendar phases run technique first and end with a full taper week', () => {
  const phases = dayPhases(42, 'never');
  assert.equal(phases[1], 'technique');
  assert.equal(phases[14], 'technique');
  assert.equal(phases[15], 'build');
  assert.equal(phases[34], 'peak');
  assert.equal(phases[35], 'taper');
  assert.equal(phases[41], 'taper');
  assert.equal(phases.length, 42);
});
test('regular lifters skip technique days', () => {
  assert.notEqual(dayPhases(42, 'regular')[1], 'technique');
});
test('short runways and taper weeks keep lifting light', () => {
  assert.ok(dayPhases(10, 'never').slice(1).every(p => p === 'taper'));
  assert.equal(isLiftDay('taper', 3), false);
  assert.equal(isLiftDay('build', 3), true);
  assert.equal(isLiftDay(null, 1), false);
});
