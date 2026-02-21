import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import { WarmupSection, WarmupExercise } from '../WarmupSection'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

const mockExercises: WarmupExercise[] = [
  {
    exerciseId: 'ex1' as any,
    name: 'World\'s Greatest Stretch',
    sets: 1,
    reps: '8 each side',
    restSeconds: 0,
    warmupPhase: 'mobility',
    section: 'warmup',
    orderIndex: 0,
  },
  {
    exerciseId: 'ex2' as any,
    name: 'Hip Circles',
    sets: 1,
    reps: '8 each side',
    restSeconds: 0,
    warmupPhase: 'mobility',
    section: 'warmup',
    orderIndex: 1,
  },
  {
    exerciseId: 'ex3' as any,
    name: 'Hollow Body Hold',
    sets: 1,
    reps: '20s',
    restSeconds: 0,
    warmupPhase: 'core_isometric',
    section: 'warmup',
    orderIndex: 2,
  },
  {
    exerciseId: 'ex4' as any,
    name: 'Dead Bug with Reach',
    sets: 1,
    reps: '8 each side',
    restSeconds: 0,
    warmupPhase: 'core_dynamic',
    section: 'warmup',
    orderIndex: 3,
  },
  {
    exerciseId: 'ex5' as any,
    name: 'Walking Knee Hug',
    sets: 1,
    reps: '20 yards',
    restSeconds: 0,
    warmupPhase: 'walking_drills',
    section: 'warmup',
    orderIndex: 4,
  },
  {
    exerciseId: 'ex6' as any,
    name: 'Jog',
    sets: 1,
    reps: '20 yards',
    restSeconds: 0,
    warmupPhase: 'movement_prep',
    section: 'warmup',
    orderIndex: 5,
  },
  {
    exerciseId: 'ex7' as any,
    name: 'Broad Jump',
    sets: 3,
    reps: '3-5',
    restSeconds: 15,
    warmupPhase: 'power_primer',
    section: 'warmup',
    orderIndex: 6,
  },
]

describe('WarmupSection', () => {
  const mockOnComplete = jest.fn()
  const mockOnBack = jest.fn()

  beforeEach(() => {
    mockOnComplete.mockClear()
    mockOnBack.mockClear()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  it('renders without crashing in flow mode', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('WARMUP')).toBeTruthy()
  })

  it('renders without crashing in preview mode', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="preview"
        phaseColor="$blue9"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Warmup')).toBeTruthy()
  })

  it('shows phase headers with labels in flow mode', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Mobility')).toBeTruthy()
    expect(getByText('Core Isometric')).toBeTruthy()
    expect(getByText('Core Dynamic')).toBeTruthy()
    expect(getByText('Walking Drills')).toBeTruthy()
    expect(getByText('Movement Prep')).toBeTruthy()
    expect(getByText('Power Primer')).toBeTruthy()
  })

  it('shows exercise names within phases in flow mode', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText("World's Greatest Stretch")).toBeTruthy()
    expect(getByText('Hip Circles')).toBeTruthy()
    expect(getByText('Hollow Body Hold')).toBeTruthy()
    expect(getByText('Broad Jump')).toBeTruthy()
  })

  it('shows exercise prescriptions (reps) in flow mode', () => {
    const { getAllByText, getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getAllByText('8 each side').length).toBeGreaterThan(0)
    expect(getByText('20s')).toBeTruthy()
    expect(getAllByText('20 yards').length).toBeGreaterThan(0)
  })

  it('"Start Workout" button fires onComplete callback', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    fireEvent.press(getByText('Start Workout'))
    expect(mockOnComplete).toHaveBeenCalledTimes(1)
  })

  it('handles empty exercise list', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={[]}
        totalDuration={0}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Start Workout')).toBeTruthy()
  })

  it('preview mode renders collapsible state', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="preview"
        phaseColor="$blue9"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Warmup')).toBeTruthy()
    expect(getByText(/10 min/)).toBeTruthy()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANGE 1: BACK NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  it('renders back button in flow mode when onBack is provided', () => {
    const { getByTestId } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByTestId('warmup-back-button')).toBeTruthy()
  })

  it('fires onBack when back button is pressed', () => {
    const { getByTestId } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    fireEvent.press(getByTestId('warmup-back-button'))
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('hides back button when onBack is not provided', () => {
    const { queryByTestId } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(queryByTestId('warmup-back-button')).toBeNull()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANGE 2: COMPACT PREVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  it('preview shows compact phase summary rows when expanded (not individual exercises)', () => {
    const { getByText, queryByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="preview"
        phaseColor="$blue9"
      />,
      { wrapper: AllTheProviders }
    )
    // Expand the preview
    fireEvent.press(getByText('Warmup'))

    // Should show phase labels as compact rows
    expect(getByText('Mobility')).toBeTruthy()
    expect(getByText('Core Isometric')).toBeTruthy()

    // Should NOT show individual exercise names
    expect(queryByText("World's Greatest Stretch")).toBeNull()
    expect(queryByText('Hip Circles')).toBeNull()
    expect(queryByText('Hollow Body Hold')).toBeNull()
  })

  it('preview compact rows show exercise count and duration per phase', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="preview"
        phaseColor="$blue9"
      />,
      { wrapper: AllTheProviders }
    )
    // Expand the preview
    fireEvent.press(getByText('Warmup'))

    // Mobility has 2 exercises (from mock data)
    expect(getByText(/2 exercises/)).toBeTruthy()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANGE 3: PHASE-LEVEL CHECKLIST
  // ═══════════════════════════════════════════════════════════════════════════

  it('phase headers are pressable in flow mode for toggling completion', () => {
    const { getByTestId } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    // Phase headers should be pressable
    expect(getByTestId('phase-toggle-mobility')).toBeTruthy()
    expect(getByTestId('phase-toggle-core_isometric')).toBeTruthy()
  })

  it('tapping phase header marks it as completed and collapses exercises', () => {
    const { getByTestId, getByText, queryByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )

    // Exercises should be visible before toggle
    expect(getByText("World's Greatest Stretch")).toBeTruthy()

    // Tap mobility phase header
    fireEvent.press(getByTestId('phase-toggle-mobility'))

    // Exercises for that phase should be hidden
    expect(queryByText("World's Greatest Stretch")).toBeNull()
    expect(queryByText("Hip Circles")).toBeNull()
  })

  it('"Start Workout" button shows progress count when phases are checked', () => {
    const { getByTestId, getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )

    // Check off one phase
    fireEvent.press(getByTestId('phase-toggle-mobility'))

    // Button should show progress count
    expect(getByText(/1\/6 complete/)).toBeTruthy()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CHANGE 4: REMOVE BREADCRUMB + DEDUPLICATE BUTTONS
  // ═══════════════════════════════════════════════════════════════════════════

  it('does not show breadcrumb text in flow mode', () => {
    const { queryByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(queryByText(/→/)).toBeNull()
  })

  it('does not show "Skip Warmup" button in flow mode', () => {
    const { queryByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(queryByText('Skip Warmup')).toBeNull()
  })

  it('shows "Skip" button in flow header', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Skip')).toBeTruthy()
  })

  it('"Skip" fires onComplete callback', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    fireEvent.press(getByText('Skip'))
    expect(mockOnComplete).toHaveBeenCalledTimes(1)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // VISUAL POLISH: TAP AFFORDANCE + HINT TEXT + PHASE COLOR
  // ═══════════════════════════════════════════════════════════════════════════

  it('renders hint text in flow mode', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Tap each phase when complete')).toBeTruthy()
  })

  it('shows "Done" text for completed phases', () => {
    const { getByTestId, getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    // Toggle mobility phase
    fireEvent.press(getByTestId('phase-toggle-mobility'))
    // Should show "Done" for completed phase
    expect(getByText('Done')).toBeTruthy()
  })

  it('renders tap affordance circle for uncompleted phases', () => {
    const { getByTestId } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByTestId('phase-affordance-mobility')).toBeTruthy()
  })

  it('hides affordance circle when phase completed', () => {
    const { getByTestId, queryByTestId } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    // Toggle mobility phase
    fireEvent.press(getByTestId('phase-toggle-mobility'))
    // Affordance circle should be gone
    expect(queryByTestId('phase-affordance-mobility')).toBeNull()
  })

  it('accepts phaseColor prop without crashing', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
        phaseColor="$blue9"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('WARMUP')).toBeTruthy()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // ALL PHASES COMPLETE STATE
  // ═══════════════════════════════════════════════════════════════════════════

  it('hides skip link when all phases are completed', () => {
    const { getByTestId, queryByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    // Complete all 6 phases
    fireEvent.press(getByTestId('phase-toggle-mobility'))
    fireEvent.press(getByTestId('phase-toggle-core_isometric'))
    fireEvent.press(getByTestId('phase-toggle-core_dynamic'))
    fireEvent.press(getByTestId('phase-toggle-walking_drills'))
    fireEvent.press(getByTestId('phase-toggle-movement_prep'))
    fireEvent.press(getByTestId('phase-toggle-power_primer'))

    // Skip link should be gone
    expect(queryByText(/Skip/)).toBeNull()
  })

  it('shows "Let\'s Go!" button when all phases are completed', () => {
    const { getByTestId, getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    // Complete all 6 phases
    fireEvent.press(getByTestId('phase-toggle-mobility'))
    fireEvent.press(getByTestId('phase-toggle-core_isometric'))
    fireEvent.press(getByTestId('phase-toggle-core_dynamic'))
    fireEvent.press(getByTestId('phase-toggle-walking_drills'))
    fireEvent.press(getByTestId('phase-toggle-movement_prep'))
    fireEvent.press(getByTestId('phase-toggle-power_primer'))

    // Button should change to "Let's Go!"
    expect(getByText("Let's Go!")).toBeTruthy()
  })

  it('"Let\'s Go!" button fires onComplete', () => {
    const { getByTestId, getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    // Complete all 6 phases
    fireEvent.press(getByTestId('phase-toggle-mobility'))
    fireEvent.press(getByTestId('phase-toggle-core_isometric'))
    fireEvent.press(getByTestId('phase-toggle-core_dynamic'))
    fireEvent.press(getByTestId('phase-toggle-walking_drills'))
    fireEvent.press(getByTestId('phase-toggle-movement_prep'))
    fireEvent.press(getByTestId('phase-toggle-power_primer'))

    fireEvent.press(getByText("Let's Go!"))
    expect(mockOnComplete).toHaveBeenCalledTimes(1)
  })
})
