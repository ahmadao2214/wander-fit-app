import {
  EVENT_PROPERTY_ALLOWLIST,
  isCanonicalAnalyticsEvent,
  sanitizeEventProperties,
  type CanonicalAnalyticsEvent,
} from '../analyticsSanitizer'

describe('analyticsSanitizer', () => {
  it('recognizes all 11 canonical events and rejects legacy onboarding events', () => {
    const canonical: CanonicalAnalyticsEvent[] = [
      '$screen',
      'first_run_step_viewed',
      'first_run_step_advanced',
      'first_run_save_sheet_opened',
      'first_run_completed',
      'workout_opened',
      'workout_started',
      'workout_completed',
      'workout_paused',
      'workout_abandoned',
      'feedback_submitted',
    ]
    expect(Object.keys(EVENT_PROPERTY_ALLOWLIST).sort()).toEqual([...canonical].sort())
    for (const ev of canonical) {
      expect(isCanonicalAnalyticsEvent(ev)).toBe(true)
    }
    expect(isCanonicalAnalyticsEvent('onboarding_started')).toBe(false)
    expect(isCanonicalAnalyticsEvent('custom_random_event')).toBe(false)
  })

  it('keeps allowlisted event and shared properties while stripping unknown keys', () => {
    const sanitized = sanitizeEventProperties(
      'workout_completed',
      {
        phase: 'GPP',
        week: 1,
        day: 2,
        intensity: 'Moderate',
        duration_seconds: 1840,
        sets_completed: 18,
        sets_skipped: 1,
        triggers_reassessment: false,
        extra_unlisted_field: 'should_drop',
      },
      {
        platform: 'ios',
        app_version: '1.0.0',
        extra_shared: 'should_drop',
      }
    )

    expect(sanitized).toEqual({
      platform: 'ios',
      app_version: '1.0.0',
      phase: 'GPP',
      week: 1,
      day: 2,
      intensity: 'Moderate',
      duration_seconds: 1840,
      sets_completed: 18,
      sets_skipped: 1,
      triggers_reassessment: false,
    })
  })

  it('strips all PII and free-text keys regardless of casing or punctuation', () => {
    const sanitized = sanitizeEventProperties(
      'feedback_submitted',
      {
        kind: 'bug_report',
        severity: 'blocking',
        source: 'workout_execute',
        email: 'athlete@example.com',
        email_address: 'athlete@example.com',
        name: 'Jordan',
        firstName: 'Jordan',
        clerkId: 'user_123',
        date_of_birth: '2010-05-01',
        dob: '2010-05-01',
        notes: 'my phone number is 555-1234',
        details: 'free text bug description',
        title: 'free text title',
        errorMessage: 'stack trace with email',
        ip: '192.168.1.1',
      },
      { platform: 'web', app_version: '1.0.0' }
    )

    expect(sanitized).toEqual({
      platform: 'web',
      app_version: '1.0.0',
      kind: 'bug_report',
      severity: 'blocking',
      source: 'workout_execute',
    })
  })

  it('drops non-primitive values, NaN/Infinity, empty strings, invalid enum values, wrong types for constrained fields, and free text in allowed categorical fields', () => {
    const sanitized = sanitizeEventProperties('feedback_submitted', {
      kind: 'feature_request',
      stars: 6, // out of 1..5 range -> dropped
      severity: 'kid@example.com', // free text / email in allowed field -> dropped
      category: 'arbitrary free text note', // not in finite enum -> dropped
      source: 'custom_unlisted_source', // not in finite enum -> dropped
    })

    expect(sanitized).toEqual({
      kind: 'feature_request',
    })

    // S7: booleans/numbers in enum fields and strings in stars must be rejected
    const wrongTypes = sanitizeEventProperties('feedback_submitted', {
      kind: 'rating',
      stars: '5' as unknown,
      severity: true as unknown,
      category: 123 as unknown,
      source: false as unknown,
    })
    expect(wrongTypes).toEqual({
      kind: 'rating',
    })

    const validFeedback = sanitizeEventProperties('feedback_submitted', {
      kind: 'bug_report',
      stars: 5,
      severity: 'blocking',
      category: 'workouts_exercises',
      source: 'workout_execute',
    })
    expect(validFeedback).toEqual({
      kind: 'bug_report',
      stars: 5,
      severity: 'blocking',
      category: 'workouts_exercises',
      source: 'workout_execute',
    })

    const screenSanitized = sanitizeEventProperties('$screen', {
      screen_name: `/${'a'.repeat(100)}`,
    })
    expect((screenSanitized.screen_name as string).length).toBe(64)
  })
})
