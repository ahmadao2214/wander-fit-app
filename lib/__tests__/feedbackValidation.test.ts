import {
  BUG_SEVERITY_OPTIONS,
  FEATURE_CATEGORY_OPTIONS,
  FEEDBACK_DETAILS_MAX,
  FEEDBACK_TITLE_MAX,
  normalizeOptionalText,
  normalizeRequiredText,
  truncateOptionalText,
  validateStars,
} from '../feedbackValidation'

describe('feedbackValidation', () => {
  describe('validateStars', () => {
    it('accepts integers 1 through 5', () => {
      for (const value of [1, 2, 3, 4, 5]) {
        expect(validateStars(value)).toBe(value)
      }
    })

    it('rejects out-of-range and non-integer values', () => {
      for (const bad of [0, 6, -1, 3.5, Number.NaN]) {
        expect(() => validateStars(bad)).toThrow('between 1 and 5')
      }
    })
  })

  describe('normalizeRequiredText', () => {
    it('trims valid text', () => {
      expect(normalizeRequiredText('  Goblet squat reps  ', 'Summary', FEEDBACK_TITLE_MAX)).toBe(
        'Goblet squat reps'
      )
    })

    it('rejects blank strings', () => {
      expect(() => normalizeRequiredText('   ', 'Summary', FEEDBACK_TITLE_MAX)).toThrow(
        'Summary is required.'
      )
    })

    it('rejects strings over max length', () => {
      expect(() =>
        normalizeRequiredText('a'.repeat(FEEDBACK_DETAILS_MAX + 1), 'Details', FEEDBACK_DETAILS_MAX)
      ).toThrow(`${FEEDBACK_DETAILS_MAX} characters or fewer`)
    })
  })

  describe('normalizeOptionalText', () => {
    it('returns undefined for missing or whitespace-only input', () => {
      expect(normalizeOptionalText(undefined, 'Note', 100)).toBeUndefined()
      expect(normalizeOptionalText('   ', 'Note', 100)).toBeUndefined()
    })

    it('throws when exceeding max length', () => {
      expect(() => normalizeOptionalText('x'.repeat(101), 'Note', 100)).toThrow(
        '100 characters or fewer'
      )
    })
  })

  describe('truncateOptionalText', () => {
    it('trims and truncates safely', () => {
      expect(truncateOptionalText('  abcdef  ', 4)).toBe('abcd')
      expect(truncateOptionalText('   ', 4)).toBeUndefined()
    })
  })

  describe('option metadata', () => {
    it('exposes the 3 bug severities and 6 feature categories', () => {
      expect(BUG_SEVERITY_OPTIONS.map((o) => o.value)).toEqual(['blocking', 'annoying', 'minor'])
      expect(FEATURE_CATEGORY_OPTIONS.map((o) => o.value)).toEqual([
        'workouts_exercises',
        'program_schedule',
        'progress_maxes',
        'equipment_gym_home',
        'app_experience',
        'other',
      ])
    })
  })
})
