# Workout Calendar Feature Plan

## Status: APPROVED - Ready for Implementation

---

## UX Model: "Start = Swap"

### Core Principle
**Starting a workout IS the swap action.** No separate "Set as Today" button needed.

### Interaction Model

| Action | What Happens |
|--------|-------------|
| **Tap workout** | Navigate to workout details screen |
| **Drag-drop** | Manual swap/rearrange (planning ahead) |
| **Start workout** | Auto-swap to today + cascade all workouts down |
| **Complete workout** | Shows on the day it was completed |

### Swap Behavior: Cascade Down

When starting a workout from a future date:
1. That workout moves to today's slot
2. Today's original workout moves to the next slot
3. Everything cascades down (maintains workout order)

```
Example: Today is Monday W1D1, user starts W4D1 workout

Before:                          After:
Mon W1D1: Lower Body            Mon W1D1: [W4D1 workout] ← IN PROGRESS
Wed W1D2: Upper Push            Wed W1D2: Lower Body ← cascaded
Fri W1D3: Power & Cond          Fri W1D3: Upper Push ← cascaded
Mon W2D1: Lower Body B          Mon W2D1: Power & Cond ← cascaded
...                             ...everything shifts...
```

### Multiple Completions Per Day

When completing multiple workouts on the same day:
- **Week view**: Stack cards vertically in day cell
- **Month view**: Show count badge "2 ✓" with tap to expand

```
Week View:          Month View:
┌─────────┐         ┌─────┐
│  Mon 3  │         │  3  │
│┌───────┐│         │ 2✓  │
││Lower ✓││         └─────┘
│└───────┘│
│┌───────┐│
││Power ✓││
│└───────┘│
└─────────┘
```

---

## Technical Architecture

### Data Model (Minimal Changes)

**Add to `intake_responses` table:**
```typescript
selectedTrainingDays: v.optional(v.array(v.number())), // [1, 3, 5] = Mon, Wed, Fri
```

**Use existing fields:**
- `user_programs.createdAt` → program start date (no new field needed)
- `user_schedule_overrides.slotOverrides` → existing swap storage
- `gpp_workout_sessions` → completion tracking with dates

### Date Mapping Algorithm

Compute calendar dates on-the-fly (no new table):

```typescript
function getDateForWorkout(
  programStartDate: Date,
  trainingDays: number[],     // [1, 3, 5] = Mon, Wed, Fri
  phase: Phase,
  week: number,
  day: number
): Date {
  // Week 1 Day 1 = first trainingDays[0] on/after programStartDate
  // Week 1 Day 2 = first trainingDays[1] on/after Week 1 Day 1
  // etc.
}
```

### Updated Mutations

**`startWorkoutSession`** - Add cascade logic:
```typescript
// If starting workout not scheduled for today:
// 1. Find today's slot
// 2. Move selected workout to today's slot
// 3. Cascade all workouts between today and selected workout's original position
// 4. Start the session
```

### New Query

**`getCalendarView({ startDate, endDate })`**
- Returns workouts mapped to dates within range
- Includes completion status, phase, workout details
- Applies slot overrides
- Groups multiple completions per day

---

## Component Structure

```
components/
  calendar/
    WorkoutCalendar.tsx           # Main container (view toggle in header)
    CalendarWeekView.tsx          # 7-column week grid
    CalendarMonthView.tsx         # Full month grid
    CalendarDayCell.tsx           # Day cell with workout card(s)
    CalendarWorkoutCard.tsx       # Draggable workout card
    CalendarNavigation.tsx        # < Feb 2-8, 2026 > navigation
    CalendarPhaseLegend.tsx       # ● GPP ● SPP ● SSP color legend
    __tests__/
      WorkoutCalendar.test.tsx
      CalendarWeekView.test.tsx
      calendarUtils.test.ts
```

---

## UI Design

### Week View
```
┌─────────────────────────────────────────────────────────────────┐
│  [<]  Feb 2 - 8, 2026  [>]                    [Week] [Month]    │
├─────────────────────────────────────────────────────────────────┤
│  ● GPP  ● SPP  ● SSP                                            │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────┤
│  Sun 2  │  Mon 3  │  Tue 4  │  Wed 5  │  Thu 6  │  Fri 7  │Sat 8│
│         │  TODAY  │         │         │         │         │     │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────┤
│         │┌───────┐│         │┌───────┐│         │┌───────┐│     │
│         ││🔵 GPP ││         ││🔵 GPP ││         ││🔵 GPP ││     │
│         ││       ││         ││       ││         ││       ││     │
│         ││Lower  ││         ││Upper  ││         ││Power  ││     │
│         ││Body   ││         ││Push   ││         ││& Cond ││     │
│         ││Found. ││         ││       ││         ││       ││     │
│         ││       ││         ││       ││         ││       ││     │
│         ││ ✓ Done││         ││🔥Today││         ││       ││     │
│         │└───────┘│         │└───────┘│         │└───────┘│     │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────┘
```

### Month View
```
┌─────────────────────────────────────────────────────────────────┐
│  [<]       February 2026       [>]              [Week] [Month]  │
├─────────────────────────────────────────────────────────────────┤
│  ● GPP  ● SPP  ● SSP                                            │
├───────┬───────┬───────┬───────┬───────┬───────┬───────┤
│  Sun  │  Mon  │  Tue  │  Wed  │  Thu  │  Fri  │  Sat  │
├───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│   1   │   2   │   3   │   4   │   5   │   6   │   7   │
│       │  🔵   │       │  🔵   │       │  🔵   │       │
│       │  ✓    │       │  🔥   │       │       │       │
├───────┼───────┼───────┼───────┼───────┼───────┼───────┤
│   8   │   9   │  10   │  11   │  12   │  13   │  14   │
│       │  🔵   │       │  🔵   │       │  🔵   │       │
└───────┴───────┴───────┴───────┴───────┴───────┴───────┘

Legend: 🔵 = GPP, 🟠 = SPP, 🟢 = SSP, ✓ = done, 🔥 = today
```

### Phase Colors
- **GPP**: Blue (`$blue9` / `$blue3` background)
- **SPP**: Orange (`$orange9` / `$orange3` background)
- **SSP**: Green (`$green9` / `$green3` background)

---

## Implementation Phases

### Phase 1: Data & Utilities
- [ ] Update schema: add `selectedTrainingDays` to intake_responses
- [ ] Update intake flow to pass actual days array
- [ ] Create `lib/calendarUtils.ts` with date mapping functions
- [ ] Write tests for date mapping

### Phase 2: Backend
- [ ] Create `convex/workoutCalendar.ts` with `getCalendarView` query
- [ ] Update `startWorkoutSession` with cascade swap logic
- [ ] Write backend tests

### Phase 3: Week View UI
- [ ] Build `CalendarWeekView` component
- [ ] Build `CalendarDayCell` component
- [ ] Build `CalendarWorkoutCard` component
- [ ] Add navigation and phase legend
- [ ] Write component tests

### Phase 4: Month View UI
- [ ] Build `CalendarMonthView` component
- [ ] Add compact workout indicators
- [ ] Add tap-to-expand for multiple workouts

### Phase 5: Drag-Drop & Integration
- [ ] Add drag-drop with react-native-gesture-handler
- [ ] Replace program.tsx with calendar view
- [ ] Handle edge cases and polish

---

## Migration Strategy

For existing users without `selectedTrainingDays`:
1. Default to common patterns based on `preferredTrainingDaysPerWeek`:
   - 3 days → [1, 3, 5] (Mon/Wed/Fri)
   - 4 days → [1, 2, 4, 5] (Mon/Tue/Thu/Fri)
   - 5 days → [1, 2, 3, 4, 5] (Mon-Fri)
   - 6 days → [1, 2, 3, 4, 5, 6] (Mon-Sat)
2. Optional: Show one-time modal to confirm/adjust training days

---

## Key Files to Modify

| File | Change |
|------|--------|
| `convex/schema.ts` | Add `selectedTrainingDays` to `intake_responses` |
| `convex/gppWorkoutSessions.ts` | Add cascade swap logic to `startSession` |
| `convex/scheduleOverrides.ts` | Reference for existing swap patterns |
| `app/(athlete)/program.tsx` | Replace with calendar view |
| `lib/calendarUtils.ts` | New file for date mapping functions |
| `components/calendar/*` | New calendar components |
