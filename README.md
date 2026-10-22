# WanderFit

[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Convex](https://img.shields.io/badge/Convex-000000?style=for-the-badge&logo=convex&logoColor=white)](https://convex.dev/)
[![Tamagui](https://img.shields.io/badge/Tamagui-000000?style=for-the-badge&logo=tamagui&logoColor=white)](https://tamagui.dev/)
[![Zustand](https://img.shields.io/badge/Zustand-000000?style=for-the-badge&logo=zustand&logoColor=white)](https://zustand-demo.pmnd.rs/)

> A workout execution app that enables personal trainers to create custom workouts for their clients, who can then execute these workouts with guided timers and tracking.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Convex Backend](#convex-backend)
- [Clerk user cleanup](#clerk-user-cleanup)
- [Key Features](#key-features)
- [Component Architecture](#component-architecture)
- [State Management](#state-management)
- [Development Workflow](#development-workflow)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [MVP Roadmap](#mvp-roadmap)

## 🎯 Overview

WanderFit is a workout execution platform designed for personal trainers and their clients. The app enables trainers to create custom workouts for specific clients, who can then execute these workouts with guided timers, set tracking, and progress monitoring.

### Core Value Proposition

**For personal trainers** who need a simple way to deliver custom workouts to their clients  
**WanderFit** is a workout execution platform  
**That** enables trainers to create, assign, and track client workouts in real-time  
**Unlike** Rise (not personalized) or Trainerize (complex)  
**Our product** provides a focused workout execution experience as a foundation for iteration

## 🛠 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Expo** | ~53.0.22 | React Native framework |
| **React Native** | 0.79.6 | Mobile app development |
| **TypeScript** | ~5.8.3 | Type safety |
| **Expo Router** | ~5.1.5 | File-based routing |
| **Tamagui** | TBD | UI component library |
| **Convex** | TBD | Backend, auth, real-time data |
| **Zustand** | TBD | State management |
| **React** | 19.0.0 | UI library |

## 📁 Project Structure

```
wander-fit/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Authentication group
│   │   ├── _layout.tsx          # Auth stack navigator
│   │   ├── login.tsx            # Login screen
│   │   └── signup.tsx           # Signup with role selection
│   ├── (trainer)/               # Trainer-specific screens
│   │   ├── _layout.tsx          # Trainer tab navigator
│   │   ├── index.tsx            # Dashboard (client list)
│   │   ├── create-workout.tsx   # Workout creation
│   │   └── client/[id].tsx      # View specific client
│   ├── (client)/                # Client-specific screens
│   │   ├── _layout.tsx          # Client tab navigator
│   │   ├── index.tsx            # Workout list
│   │   ├── workout/[id].tsx     # Workout details
│   │   └── execute/[id].tsx     # Workout execution screen
│   ├── _layout.tsx              # Root layout with auth check
│   └── +not-found.tsx           # 404 page
├── components/                   # Reusable UI components
│   ├── auth/                    # Authentication components
│   ├── trainer/                 # Trainer-specific components
│   ├── client/                  # Client-specific components
│   └── shared/                  # Shared components
├── convex/                      # Convex backend
│   ├── schema.ts                # Database schema
│   ├── auth.config.ts           # Auth configuration
│   └── functions/               # Backend functions
├── hooks/                       # Custom React hooks
├── stores/                      # Zustand stores
├── types/                       # TypeScript type definitions
├── constants/                   # App constants
└── assets/                      # Static assets
```

### Navigation Flow

```typescript
// Navigation Flow:
1. App Start → Auth Check
2. Not Authenticated → (auth)/login
3. Authenticated + role=trainer → (trainer)/index
4. Authenticated + role=client → (client)/index
5. Trainer: Dashboard → Create Workout → Back to Dashboard
6. Client: Workout List → Workout Details → Execute → Complete → Back to List
```

## 🗄 Convex Backend

### Schema Definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("trainer"), v.literal("client")),
    trainerId: v.optional(v.id("users")), // for clients only
    clerkId: v.string(), // from Convex Auth
  })
    .index("by_email", ["email"])
    .index("by_clerk", ["clerkId"])
    .index("by_trainer", ["trainerId"]),

  workouts: defineTable({
    trainerId: v.id("users"),
    clientId: v.id("users"),
    name: v.string(),
    exercises: v.array(
      v.object({
        id: v.string(), // unique ID for tracking
        name: v.string(),
        sets: v.number(),
        reps: v.optional(v.number()), // for rep-based
        duration: v.optional(v.number()), // seconds for time-based
        restDuration: v.number(), // seconds between sets
        orderIndex: v.number(),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_trainer", ["trainerId"]),

  workoutSessions: defineTable({
    workoutId: v.id("workouts"),
    clientId: v.id("users"),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    totalDuration: v.optional(v.number()), // seconds
    exercises: v.array(
      v.object({
        exerciseId: v.string(), // matches exercise.id from workout
        completed: v.boolean(),
        skipped: v.boolean(),
        sets: v.array(
          v.object({
            repsCompleted: v.optional(v.number()),
            completed: v.boolean(),
          })
        ),
      })
    ),
  })
    .index("by_client", ["clientId"])
    .index("by_workout", ["workoutId"]),
});
```

### Key Convex Functions

```typescript
// convex/functions/workouts.ts
export const createWorkout = mutation({
  args: {
    name: v.string(),
    clientId: v.id("users"),
    exercises: v.array(v.object({
      name: v.string(),
      sets: v.number(),
      reps: v.optional(v.number()),
      duration: v.optional(v.number()),
      restDuration: v.number(),
    }))
  },
  handler: async (ctx, args) => {
    // Implementation
  }
});

export const getClientWorkouts = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    // Implementation
  }
});
```

## 🧹 Clerk user cleanup

The Clerk Development instance has a hard 100-user cap; once it's full, nobody can sign up.
To clear out test and abandoned accounts in bulk:

1. Add the Development secret key (`sk_test_...`, Clerk dashboard → WanderFit → Development → API keys) to `.env.local` as `CLERK_SECRET_KEY`. Never commit it.
2. `npx tsx scripts/clerk-cleanup.ts` does a dry run: it lists every user, flags likely junk (`+clerk_test` / `@example.com` / test-like emails, no sign-in after sign-up, no verified email) and shows the count against the cap.
3. `--delete` removes all flagged users, `--pick` lets you choose by number, and `--keep <email>` protects an account, and `--skip-convex-users` leaves anyone with a Convex `users` row alone. Both delete modes require typing a confirmation phrase.

`claude-test-1792639039+clerk_test@example.com` (shared automated-test account) is always kept. Deleting from Clerk leaves rows in the Convex `users` table; the script reports them but doesn't touch Convex. Details and the proposed Convex cleanup are in [docs/CLERK_USER_CLEANUP.md](docs/CLERK_USER_CLEANUP.md).

## ✨ Key Features

### 🔐 Authentication System
- **Convex Auth** with email/password
- **Role-based access** (trainer/client)
- **Session management** with automatic persistence

### 👨‍🏫 Trainer Features
- **Create custom workouts** with exercises
- **Assign workouts** to specific clients
- **Manage client relationships**
- **View workout completion** status

### 👤 Client Features
- **View assigned workouts** from trainer
- **Execute workouts** with guided timers
- **Track progress** and completion
- **Real-time sync** with trainer

### ⏱ Timer System
- **Overall workout timer** (elapsed time)
- **Exercise-specific timers** for timed exercises
- **Rest timers** between sets
- **Background execution** support

### 📊 Progress Tracking
- **Manual set completion** tracking
- **Rep counting** for rep-based exercises
- **Workout completion** status
- **Session history** storage

## 🏗 Component Architecture

### Core Components Structure

```typescript
components/
├── auth/
│   ├── LoginForm.tsx
│   └── SignupForm.tsx
├── trainer/
│   ├── ClientList.tsx
│   ├── WorkoutForm/
│   │   ├── index.tsx
│   │   ├── ExerciseInput.tsx
│   │   └── ClientSelector.tsx
│   └── ClientWorkoutHistory.tsx
├── client/
│   ├── WorkoutCard.tsx
│   ├── WorkoutDetails.tsx
│   └── WorkoutExecution/
│       ├── index.tsx
│       ├── ExerciseDisplay.tsx
│       ├── TimerDisplay.tsx
│       ├── SetCounter.tsx
│       ├── ProgressBar.tsx
│       └── RestTimer.tsx
└── shared/
    ├── Button.tsx
    ├── Input.tsx
    ├── Card.tsx
    └── Timer.tsx
```

### Key Component Interfaces

```typescript
// WorkoutExecution/index.tsx
interface WorkoutExecutionProps {
  workout: Workout;
  onComplete: (session: WorkoutSession) => void;
}

interface ExecutionState {
  currentExerciseIndex: number;
  currentSetIndex: number;
  isResting: boolean;
  workoutElapsedTime: number; // seconds
  exerciseTimer: number; // for timed exercises
  restTimer: number;
  completedSets: CompletedSet[];
}

// TimerDisplay.tsx
interface TimerDisplayProps {
  type: 'workout' | 'exercise' | 'rest';
  seconds: number;
  isActive: boolean;
  onComplete?: () => void;
}
```

## 🗃 State Management

### Zustand Store Structure
```typescript
// stores/workoutStore.ts
interface WorkoutStore {
  // State
  currentWorkout: Workout | null;
  executionState: ExecutionState;
  isExecuting: boolean;
  
  // Actions
  startWorkout: (workout: Workout) => void;
  completeSet: (reps?: number) => void;
  skipExercise: () => void;
  completeWorkout: () => void;
  resetExecution: () => void;
}

// stores/authStore.ts
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  role: 'trainer' | 'client' | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

// stores/timerStore.ts
interface TimerStore {
  workoutTimer: number;
  exerciseTimer: number;
  restTimer: number;
  
  // Actions
  startWorkoutTimer: () => void;
  startExerciseTimer: (duration: number) => void;
  startRestTimer: (duration: number) => void;
  pauseAllTimers: () => void;
  resetTimers: () => void;
}
Usage Example
typescript// In a component
import { useWorkoutStore } from '@/stores/workoutStore';

function WorkoutExecution() {
  const { currentWorkout, completeSet, isExecuting } = useWorkoutStore();
  
  // Use store values and actions
}
```


📋 MVP Roadmap
Week 1 Sprint (Current)
Days 1-2: Foundation ✅

 Expo + TypeScript setup
 Tamagui configuration
 Convex project setup with schema
 Auth implementation
 Basic navigation structure

Days 3-4: Core Features

 Workout creation flow
 Convex mutations and queries
 Client workout list
 Basic workout detail view

Days 5-6: Execution Experience

 Workout timer (elapsed time)
 Exercise-specific timers
 Set/exercise progression
 Rest timer implementation
 Completion tracking

Day 7: Polish & Demo

 Bug fixes
 Basic UI polish
 Demo data setup
 Deploy web version
 Prepare demo

Post-MVP Fast Follows
Immediate Priority

Stripe Integration - Payment processing for trainer subscriptions

Next Features

Exercise library/templates
Workout history view
Exercise demo videos/images
Progressive overload tracking
Trainer analytics dashboard
Equipment/location variants
Client messaging

🎯 Definition of Done
MVP Checklist

 Working auth system (trainer and client roles)
 Trainer can create workout with exercises
 Client sees assigned workouts
 Workout execution with all timers functional
 Basic completion tracking
 Deployed on web for demo
 Mobile app tested via Expo Go
 Clien has successfully created a workout