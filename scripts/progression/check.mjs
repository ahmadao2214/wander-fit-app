import assert from 'node:assert/strict'
import { ConvexHttpClient } from 'convex/browser'
import { anyApi as api } from 'convex/server'

const { CONVEX_SELF_HOSTED_URL: url, CONVEX_SELF_HOSTED_ADMIN_KEY: key } = process.env
assert.equal(new URL(url).hostname, '127.0.0.1')
const admin = new ConvexHttpClient(url)
admin.setAdminAuth(key)

async function setup(subject, week, day, days, weeks, redo) {
  const ids = await admin.mutation(api.progressionFixture.seed, {
    subject,
    week,
    day,
    days,
    weeks,
    redo,
  })
  const athlete = new ConvexHttpClient(url)
  athlete.setAdminAuth(key, {
    subject,
    issuer: 'https://model.invalid',
    email: `${subject}@example.com`,
  })
  return { ...ids, athlete }
}

function cursor(program) {
  return [program.currentPhase, program.currentWeek, program.currentDay]
}

async function replay(insertion, sendId) {
  const actions = ['A.start', 'A.complete', 'A.advance']
  actions.splice(insertion, 0, 'B.start')
  const label = `${actions.join(' → ')} (${sendId ? 'session ID' : 'no ID'})`
  const { programId, templates, athlete } = await setup(
    `redo${insertion}${Number(sendId)}`,
    2,
    2,
    2,
    5,
    true
  )
  let owner = null
  let sessionId
  let result
  for (const action of actions) {
    if (action.endsWith('.start')) {
      const actor = action[0]
      const start = () =>
        athlete.mutation(api.gppWorkoutSessions.startSession, {
          templateId: templates[actor === 'A' ? 'W2D1' : 'W2D2'],
          skipCascade: true,
        })
      if (owner) {
        await assert.rejects(start, /paused workout/i, label)
      } else {
        const started = await start()
        assert.ok(started.sessionId, label)
        owner = actor
        if (actor === 'A') sessionId = started.sessionId
      }
    } else if (sessionId && action === 'A.complete') {
      const { exercises } = await athlete.query(api.gppWorkoutSessions.getById, { sessionId })
      await athlete.mutation(api.gppWorkoutSessions.completeSession, { sessionId, exercises })
      owner = null
    } else if (sessionId && action === 'A.advance') {
      result = await athlete.mutation(api.userPrograms.advanceToNextDay, {
        programId,
        ...(sendId ? { sessionId } : {}),
      })
    }
    const stored = await athlete.query(api.userPrograms.getCurrentUserProgram, {})
    assert.deepEqual(
      cursor(stored),
      ['GPP', 2, 2],
      `${label} after ${action}: persisted W${stored.currentWeek}D${stored.currentDay}`
    )
    if (sessionId && action === 'A.advance') {
      assert.equal(result.advanced, false, label)
      assert.deepEqual(cursor(result), cursor(stored), label)
    }
  }
}

for (let insertion = 0; insertion <= 3; insertion++) {
  for (const sendId of [false, true]) await replay(insertion, sendId)
}

const boundaries = [
  [3, 4, 4, 4, 4, 1, false],
  [2, 2, 4, 4, 2, 3, false],
  [2, 4, 4, 4, 3, 1, false],
  [4, 4, 4, 4, 4, 4, true],
  [4, 3, 3, 4, 4, 3, true],
  [6, 4, 4, 6, 6, 4, true],
  [4, 3, 4, 4, 4, 4, false],
]
for (const [index, [week, day, days, weeks, nextWeek, nextDay, final]] of boundaries.entries()) {
  const { athlete, programId } = await setup(`boundary${index}`, week, day, days, weeks, false)
  const result = await athlete.mutation(api.userPrograms.advanceToNextDay, { programId })
  const stored = await athlete.query(api.userPrograms.getCurrentUserProgram, {})
  const label = `W${week}D${day} of ${weeks} weeks × ${days} days`
  assert.deepEqual(cursor(stored), ['GPP', nextWeek, nextDay], label)
  assert.deepEqual(cursor(result), cursor(stored), label)
  assert.equal(result.advanced, true, label)
  assert.equal(result.phaseComplete, final, label)
  assert.equal(result.triggerReassessment, final || undefined, label)
  assert.equal(stored.reassessmentPendingForPhase, final ? 'GPP' : undefined, label)
}
console.log(`Passed 8 two-device traces and ${boundaries.length} boundary cases on Convex`)
