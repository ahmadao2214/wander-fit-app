import {
  isWarmupExercise,
  mainTemplateIndices,
  normalizeExerciseOrder,
  mainOrderToTemplateOrder,
  templateOrderToMainOrder,
  alignCompletionsToTemplate,
} from '../executionOrder'

// The template behind the bug report: one legacy warmup item (marked by
// notes), then six main exercises.
const template = [
  { exerciseId: 'cat_cow', notes: 'Warmup' }, // 0 (warmup)
  { exerciseId: 'goblet_squat' }, // 1
  { exerciseId: 'worlds_greatest_stretch' }, // 2
  { exerciseId: 'reverse_lunge' }, // 3
  { exerciseId: 'romanian_deadlift' }, // 4
  { exerciseId: 'plank' }, // 5
  { exerciseId: 'glute_bridge' }, // 6
]

const completion = (exerciseId: string, sets: number) => ({
  exerciseId,
  completed: false,
  skipped: false,
  sets: Array.from({ length: sets }, () => ({ completed: false, skipped: false })),
})

describe('isWarmupExercise', () => {
  it('reads the section field, and the notes field on older templates', () => {
    expect(isWarmupExercise({ exerciseId: 'a', section: 'warmup' })).toBe(true)
    expect(isWarmupExercise({ exerciseId: 'a', notes: 'Warmup' })).toBe(true)
    expect(isWarmupExercise({ exerciseId: 'a', section: 'main', notes: 'Warmup' })).toBe(false)
    expect(isWarmupExercise({ exerciseId: 'a' })).toBe(false)
  })
})

describe('mainTemplateIndices', () => {
  it('lists the template indices of the non-warmup exercises', () => {
    expect(mainTemplateIndices(template)).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('normalizeExerciseOrder', () => {
  it('defaults to template order', () => {
    expect(normalizeExerciseOrder(undefined, template)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('keeps a valid custom order', () => {
    expect(normalizeExerciseOrder([2, 4, 1, 3, 5, 6], template)).toEqual([2, 4, 1, 3, 5, 6])
  })

  it('repairs a truncated order: drops warmup and unknown indices, appends what is missing', () => {
    // What the detail screen used to send: main-relative indices taken as
    // template indices, so 0 points at the warmup and 6 is never listed
    expect(normalizeExerciseOrder([0, 1, 3, 2, 4, 5, 99, 3], template)).toEqual([1, 3, 2, 4, 5, 6])
  })
})

describe('main <-> template order', () => {
  it('converts the detail screen\'s main-relative order to template indices', () => {
    expect(mainOrderToTemplateOrder([1, 3, 0, 2, 4, 5], template)).toEqual([2, 4, 1, 3, 5, 6])
  })

  it('converts template indices back to main-relative positions', () => {
    expect(templateOrderToMainOrder([2, 4, 1, 3, 5, 6], template)).toEqual([1, 3, 0, 2, 4, 5])
  })

  it('round-trips', () => {
    const main = [5, 4, 3, 2, 1, 0]
    expect(templateOrderToMainOrder(mainOrderToTemplateOrder(main, template), template)).toEqual(main)
  })
})

describe('alignCompletionsToTemplate', () => {
  it('keeps a correctly aligned full array as is', () => {
    const saved = template.map((ex, i) => completion(ex.exerciseId, i + 1))
    const aligned = alignCompletionsToTemplate(template, saved)
    expect(aligned.map((c) => c?.exerciseId)).toEqual(template.map((ex) => ex.exerciseId))
    expect(aligned[1]?.sets).toHaveLength(2)
  })

  it('puts each exercise\'s sets back under that exercise when a save was scrambled by reordering', () => {
    // Saved positionally after a reorder: Romanian Deadlift's slot holds
    // Goblet Squat's six sets, which is what the athlete saw
    const saved = [
      completion('cat_cow', 1),
      completion('romanian_deadlift', 3),
      completion('worlds_greatest_stretch', 1),
      completion('reverse_lunge', 3),
      completion('goblet_squat', 6),
      completion('plank', 3),
      completion('glute_bridge', 3),
    ]
    const aligned = alignCompletionsToTemplate(template, saved)
    expect(aligned[1]?.exerciseId).toBe('goblet_squat')
    expect(aligned[1]?.sets).toHaveLength(6)
    expect(aligned[4]?.exerciseId).toBe('romanian_deadlift')
    expect(aligned[4]?.sets).toHaveLength(3)
  })

  it('aligns an older save that left the warmup out', () => {
    const saved = template.slice(1).map((ex) => completion(ex.exerciseId, 2))
    const aligned = alignCompletionsToTemplate(template, saved)
    expect(aligned[0]).toBeUndefined()
    expect(aligned.slice(1).map((c) => c?.exerciseId)).toEqual(template.slice(1).map((ex) => ex.exerciseId))
  })

  it('handles an exercise that appears in both warmup and main', () => {
    const withRepeat = [
      { exerciseId: 'dead_bug', section: 'warmup' },
      { exerciseId: 'squat', section: 'main' },
      { exerciseId: 'dead_bug', section: 'main' },
    ]
    const saved = [completion('dead_bug', 1), completion('squat', 4), completion('dead_bug', 3)]
    const aligned = alignCompletionsToTemplate(withRepeat, saved)
    expect(aligned.map((c) => c?.sets.length)).toEqual([1, 4, 3])
  })

  it('leaves a slot empty when nothing was saved for it', () => {
    const aligned = alignCompletionsToTemplate(template, [completion('goblet_squat', 6)])
    expect(aligned[1]?.exerciseId).toBe('goblet_squat')
    expect(aligned.filter(Boolean)).toHaveLength(1)
  })
})
