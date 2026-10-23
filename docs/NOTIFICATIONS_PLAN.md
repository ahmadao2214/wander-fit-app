# Notifications Plan

> Keeping athletes engaged and parents informed

## Overview

**Goal:** Implement push and email notifications to drive engagement, protect streaks, and keep parents in the loop.

**Current State:** No notification system exists. Users must open the app to know what's happening.

---

## Notification Types

### Athlete Notifications (Push)

| Type | Trigger | Message Example | Priority |
|------|---------|-----------------|----------|
| **Workout Reminder** | Daily at set time | "Time to train! Today's workout is ready." | High |
| **Streak at Risk** | 24h before streak breaks | "Don't lose your 7-day streak! Train today." | High |
| **Streak Milestone** | On milestone | "You hit a 30-day streak! Open to claim your reward." | Medium |
| **Achievement Unlocked** | On badge unlock | "New badge: Week Warrior! Check it out." | Medium |
| **Phase Complete** | On phase finish | "You completed Build Your Base! Level Up awaits." | Medium |
| **Inactivity** | 3+ days no workout | "We miss you! Your next workout is waiting." | Low |

### Parent Notifications (Push + Email)

| Type | Trigger | Channel | Priority |
|------|---------|---------|----------|
| **Child Workout Complete** | On workout complete | Push | Medium |
| **Streak Milestone (30+)** | On 30, 50, 100 day | Push + Email | High |
| **Weekly Summary** | Sunday evening | Email | Medium |
| **Inactivity Alert** | 5+ days no workout | Push + Email | Medium |

---

## Push Notification System

### Technology: Expo Notifications

Using Expo's push notification service (free for reasonable volume).

### Setup Flow

```
App Launch
  ↓
Check if notifications enabled
  ↓
If not → Prompt for permission (onboarding or later)
  ↓
If granted → Get Expo push token
  ↓
Store token in Convex (users table)
  ↓
Backend can now send push notifications
```

### Implementation

#### 1. Notification Setup

```typescript
// lib/notifications/setup.ts

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  // Check if physical device (notifications don't work on simulator)
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device')
    return null
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  // Request permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied')
    return null
  }

  // Get Expo push token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-project-id', // From app.json
  })

  // Android-specific channel setup
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  return token.data
}
```

#### 2. Store Token in Convex

```typescript
// convex/users.ts

export const updatePushToken = mutation({
  args: {
    pushToken: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', identity.subject))
      .first()

    if (!user) throw new Error('User not found')

    await ctx.db.patch(user._id, {
      expoPushToken: args.pushToken,
    })
  },
})
```

#### 3. Send Push Notification (Backend)

```typescript
// convex/notifications.ts

import { action } from './_generated/server'
import { v } from 'convex/values'

export const sendPushNotification = action({
  args: {
    userId: v.id('users'),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get user's push token
    const user = await ctx.runQuery(internal.users.getById, { id: args.userId })
    if (!user?.expoPushToken) return { success: false, reason: 'No push token' }

    // Send via Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: user.expoPushToken,
        title: args.title,
        body: args.body,
        data: args.data || {},
        sound: 'default',
      }),
    })

    const result = await response.json()
    return { success: true, result }
  },
})
```

#### 4. Notification Response Handler

```typescript
// lib/notifications/handlers.ts

import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'

export function setupNotificationResponseHandler() {
  // Handle notification when app is in foreground
  Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification)
  })

  // Handle notification tap
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data

    // Navigate based on notification type
    switch (data?.type) {
      case 'workout_reminder':
        router.push('/(athlete)/')
        break
      case 'streak_milestone':
        router.push('/(athlete)/profile')
        break
      case 'achievement':
        router.push('/(athlete)/profile/achievements')
        break
      default:
        router.push('/(athlete)/')
    }
  })
}
```

---

## Scheduled Notifications

### Workout Reminders

**User sets preferred reminder time in settings.**

```typescript
// convex/notifications.ts

// Schedule daily reminder (runs via cron)
export const sendWorkoutReminders = action({
  handler: async (ctx) => {
    const now = new Date()
    const currentHour = now.getUTCHours()

    // Get users whose reminder time matches current hour
    // (simplified - real implementation needs timezone handling)
    const users = await ctx.runQuery(internal.users.getUsersForReminder, {
      hour: currentHour,
    })

    for (const user of users) {
      // Check if they already completed today's workout
      const completedToday = await ctx.runQuery(
        internal.workouts.hasCompletedToday,
        { userId: user._id }
      )

      if (!completedToday) {
        await ctx.runAction(internal.notifications.sendPushNotification, {
          userId: user._id,
          title: "Time to train! 💪",
          body: "Today's workout is ready. Let's go!",
          data: { type: 'workout_reminder' },
        })
      }
    }
  },
})
```

### Streak at Risk Alerts

```typescript
// Check for at-risk streaks (runs daily)
export const sendStreakAtRiskAlerts = action({
  handler: async (ctx) => {
    // Get users with active streaks who haven't worked out today
    const atRiskUsers = await ctx.runQuery(
      internal.streaks.getUsersWithStreakAtRisk
    )

    for (const user of atRiskUsers) {
      await ctx.runAction(internal.notifications.sendPushNotification, {
        userId: user._id,
        title: `Don't lose your ${user.currentStreak}-day streak! 🔥`,
        body: "Train today to keep your streak alive.",
        data: { type: 'streak_at_risk' },
      })
    }
  },
})
```

### Cron Jobs

```typescript
// convex/crons.ts

import { cronJobs } from 'convex/server'

const crons = cronJobs()

// Workout reminders - run every hour to catch different timezones
crons.hourly('workout reminders', { minuteUTC: 0 }, 'notifications:sendWorkoutReminders')

// Streak at risk - run once daily in evening
crons.daily('streak at risk', { hourUTC: 22, minuteUTC: 0 }, 'notifications:sendStreakAtRiskAlerts')

// Weekly summary for parents - Sunday evening
crons.weekly('parent summary', { dayOfWeek: 'sunday', hourUTC: 18, minuteUTC: 0 }, 'notifications:sendParentWeeklySummary')

export default crons
```

---

## Email Notifications

### Service: Resend (Recommended)

Simple, developer-friendly email API. Free tier: 100 emails/day.

### Email Templates

#### Weekly Parent Summary

```typescript
// convex/emails.ts

export const sendParentWeeklySummary = action({
  args: { parentId: v.id('users') },
  handler: async (ctx, args) => {
    const parent = await ctx.runQuery(internal.users.getById, { id: args.parentId })
    const children = await ctx.runQuery(internal.parent.getLinkedChildren, { parentId: args.parentId })

    for (const child of children) {
      const weekStats = await ctx.runQuery(internal.stats.getWeeklyStats, { userId: child._id })

      await sendEmail({
        to: parent.email,
        subject: `${child.name}'s Weekly Training Summary`,
        html: renderWeeklySummaryEmail({
          childName: child.name,
          workoutsCompleted: weekStats.workoutsCompleted,
          totalMinutes: weekStats.totalMinutes,
          currentStreak: weekStats.currentStreak,
          achievements: weekStats.newAchievements,
        }),
      })
    }
  },
})
```

#### Email Template (React Email)

```tsx
// emails/templates/weekly-summary.tsx

import { Html, Head, Body, Container, Section, Text, Button } from '@react-email/components'

interface WeeklySummaryProps {
  childName: string
  workoutsCompleted: number
  plannedWorkouts: number
  totalMinutes: number
  currentStreak: number
  achievements: string[]
}

export function WeeklySummaryEmail(props: WeeklySummaryProps) {
  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.heading}>
            {props.childName}'s Week in Review
          </Text>

          <Section style={styles.statsSection}>
            <Text style={styles.stat}>
              Workouts: {props.workoutsCompleted}/{props.plannedWorkouts}
            </Text>
            <Text style={styles.stat}>
              Training Time: {props.totalMinutes} minutes
            </Text>
            <Text style={styles.stat}>
              Current Streak: {props.currentStreak} days 🔥
            </Text>
          </Section>

          {props.achievements.length > 0 && (
            <Section>
              <Text style={styles.subheading}>New Achievements</Text>
              {props.achievements.map((a) => (
                <Text key={a}>🏆 {a}</Text>
              ))}
            </Section>
          )}

          <Button href="https://app.wanderfit.com" style={styles.button}>
            View Full Progress
          </Button>
        </Container>
      </Body>
    </Html>
  )
}
```

---

## Notification Preferences

### User Settings Screen

```
┌─────────────────────────────────────────────┐
│           NOTIFICATION SETTINGS             │
├─────────────────────────────────────────────┤
│                                             │
│  WORKOUT REMINDERS                          │
│  ─────────────────────────────────────────  │
│  Daily reminder          [  ON  ]           │
│  Reminder time           [ 4:00 PM ]        │
│                                             │
│  STREAKS                                    │
│  ─────────────────────────────────────────  │
│  Streak at risk alerts   [  ON  ]           │
│  Milestone celebrations  [  ON  ]           │
│                                             │
│  ACHIEVEMENTS                               │
│  ─────────────────────────────────────────  │
│  New badge unlocked      [  ON  ]           │
│                                             │
│  ───────────────────────────────────────    │
│  🔕 Quiet hours: 10 PM - 7 AM               │
│                                             │
└─────────────────────────────────────────────┘
```

### Schema

```typescript
// Add to users table
notificationPreferences: v.optional(v.object({
  workoutReminders: v.boolean(),
  reminderTime: v.string(),  // "16:00" format
  streakAlerts: v.boolean(),
  milestones: v.boolean(),
  achievements: v.boolean(),
  quietHoursStart: v.optional(v.string()),  // "22:00"
  quietHoursEnd: v.optional(v.string()),    // "07:00"
}))
```

---

## File Structure

```
lib/
  notifications/
    setup.ts              # Permission & token registration
    handlers.ts           # Response handlers
    preferences.ts        # Default preferences

convex/
  notifications.ts        # Send notification actions
  crons.ts               # Scheduled jobs

app/
  (athlete)/
    profile/
      notifications.tsx   # Preferences screen

emails/
  templates/
    weekly-summary.tsx    # Parent weekly email
    milestone-alert.tsx   # Milestone notification
    inactivity.tsx       # Re-engagement email
```

---

## Acceptance Criteria

### Push Notifications
- [ ] Permission requested appropriately
- [ ] Push token stored in database
- [ ] Workout reminders sent at user's preferred time
- [ ] Streak at risk alerts work correctly
- [ ] Notification tap opens correct screen
- [ ] Respects quiet hours
- [ ] Preferences are saved and respected

### Email Notifications
- [ ] Weekly summary sent to parents on Sunday
- [ ] Email contains accurate stats
- [ ] Unsubscribe link works
- [ ] Email renders correctly on mobile

---

## Testing Requirements

### Unit Tests
```typescript
describe('notifications', () => {
  it('respects user preferences', () => {})
  it('does not send during quiet hours', () => {})
  it('includes correct streak count', () => {})
})
```

### Manual Testing
- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Test notification tap navigation
- [ ] Test email rendering
- [ ] Test quiet hours

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Expo notifications setup | 3-4 hours |
| Token storage (Convex) | 1-2 hours |
| Send notification action | 2-3 hours |
| Workout reminder cron | 2-3 hours |
| Streak at risk cron | 2-3 hours |
| Notification handlers | 2-3 hours |
| Preferences screen | 3-4 hours |
| Email setup (Resend) | 2-3 hours |
| Email templates | 3-4 hours |
| Weekly summary cron | 2-3 hours |
| Testing | 4-6 hours |
| **Total** | **1-2 weeks** |

---

## Dependencies

| Dependency | Purpose | Cost |
|------------|---------|------|
| `expo-notifications` | Push notifications | Free |
| `expo-device` | Device detection | Free |
| Resend | Email delivery | Free tier: 100/day |
| `@react-email/components` | Email templates | Free |

---

## Open Questions

- [ ] What's the default reminder time?
- [ ] Should we send push notifications to parents for every workout?
- [ ] How do we handle timezone differences?
- [ ] What's the re-engagement strategy after inactivity?

---

## Related Documents

- [PARENT_EXPERIENCE_PLAN.md](./PARENT_EXPERIENCE_PLAN.md) - Parent notifications
- [STREAK_MILESTONES_PLAN.md](./STREAK_MILESTONES_PLAN.md) - Milestone notifications
- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) - Overall priorities

---

*Status: Planning*
*Effort: 1-2 weeks*
*Priority: 🟠 High*
