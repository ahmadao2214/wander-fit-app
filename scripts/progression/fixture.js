import { internalMutation } from './_generated/server'
import { v } from 'convex/values'

export const seed = internalMutation({
  args: {
    subject: v.string(),
    week: v.number(),
    day: v.number(),
    days: v.number(),
    weeks: v.number(),
    redo: v.boolean(),
  },
  handler: async ({ db }, { subject, week, day, days, weeks, redo }) => {
    const now = Date.now()
    const dayMs = 86400000
    const userId = await db.insert('users', {
      email: `${subject}@example.com`,
      name: subject,
      clerkId: subject,
      role: 'client',
      createdAt: now,
      intakeCompletedAt: now,
    })
    const sportId = await db.insert('sports', { name: 'Basketball', gppCategoryId: 2 })
    const intakeResponseId = await db.insert('intake_responses', {
      userId,
      sportId,
      yearsOfExperience: 2,
      preferredTrainingDaysPerWeek: days,
      assignedGppCategoryId: 2,
      assignedSkillLevel: 'Moderate',
      intakeType: 'initial',
      completedAt: now,
    })
    const programId = await db.insert('user_programs', {
      userId,
      intakeResponseId,
      gppCategoryId: 2,
      skillLevel: 'Moderate',
      currentPhase: 'GPP',
      currentWeek: week,
      currentDay: day,
      weeksPerPhase: weeks,
      phaseStartDate: now - 30 * dayMs,
      createdAt: now - 30 * dayMs,
      updatedAt: now,
    })
    const templates = {}
    if (redo) {
      let catalog = await db.query('program_templates').collect()
      if (!catalog.length) {
        const exerciseId = await db.insert('exercises', {
          name: 'Goblet Squat',
          slug: 'goblet_squat',
          tags: ['squat'],
        })
        for (let week = 1; week <= 4; week++) {
          for (let day = 1; day <= 2; day++) {
            await db.insert('program_templates', {
              gppCategoryId: 2,
              phase: 'GPP',
              skillLevel: 'Moderate',
              week,
              day,
              name: `W${week}D${day}`,
              estimatedDurationMinutes: 30,
              exercises: [
                {
                  exerciseId,
                  sets: 1,
                  reps: '10',
                  restSeconds: 60,
                  orderIndex: 0,
                  section: 'main',
                },
              ],
            })
          }
        }
        catalog = await db.query('program_templates').collect()
      }
      for (const { name, phase, week, day, _id: templateId, exercises } of catalog) {
        templates[name] = templateId
        if (week > 2) continue
        const completedAt = now - (10 - week * 2 - day) * dayMs
        await db.insert('gpp_workout_sessions', {
          userId,
          templateId,
          userProgramId: programId,
          startedAt: completedAt,
          completedAt,
          status: 'completed',
          templateSnapshot: { name, phase, week, day, workoutDate: completedAt },
          exercises: [
            {
              exerciseId: exercises[0].exerciseId,
              completed: true,
              skipped: false,
              sets: [{ completed: true, skipped: false, repsCompleted: 10 }],
            },
          ],
        })
      }
    }
    return { programId, templates }
  },
})
