import { readFileSync } from 'fs'
import { join } from 'path'

// Issue #210: Done in the signed-in app is a neutral tick plus the word Done.
// Green stays free (intensity low, and soccer's sport colour), so the chrome
// that marks a workout, exercise, set or warmup step done never paints green.
const ROOT = join(__dirname, '..', '..')
const DONE_CHROME = [
  'app/(athlete)/index.tsx',
  'app/(athlete)/history.tsx',
  'app/(athlete)/profile.tsx',
  'app/(athlete)/workout/[id].tsx',
  'app/(athlete)/workout/execute/[id].tsx',
  'components/workout/ExerciseQueue.tsx',
  'components/workout/PerformanceReviewItem.tsx',
  'components/workout/WarmupSection.tsx',
]
const GREEN = /\$green\d+|\$intensityLow\d+/g

describe('Done chrome', () => {
  it('paints no green in the signed-in screens that mark things done', () => {
    const found = DONE_CHROME.flatMap((file) =>
      (readFileSync(join(ROOT, file), 'utf8').match(GREEN) ?? []).map((token) => `${file}: ${token}`),
    )
    expect(found).toEqual([])
  })

  it('labels Done in the words colour', () => {
    const labels = DONE_CHROME.flatMap((file) =>
      [...readFileSync(join(ROOT, file), 'utf8').matchAll(/<Caption[^>]*color="([^"]+)"[^>]*>\s*Done\s*</g)].map(
        (m) => ({ file, color: m[1] }),
      ),
    )
    // The Today card and the warmup rows both say Done
    expect(labels.length).toBeGreaterThanOrEqual(2)
    expect(labels.filter((l) => l.color !== '$color')).toEqual([])
  })
})
