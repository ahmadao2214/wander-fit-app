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
  const mockOnSkip = jest.fn()

  beforeEach(() => {
    mockOnComplete.mockClear()
    mockOnSkip.mockClear()
  })

  it('renders without crashing in flow mode', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Warmup')).toBeTruthy()
  })

  it('renders without crashing in preview mode', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        mode="preview"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Warmup')).toBeTruthy()
  })

  it('shows phase headers with labels', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
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

  it('shows exercise names within phases', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText("World's Greatest Stretch")).toBeTruthy()
    expect(getByText('Hip Circles')).toBeTruthy()
    expect(getByText('Hollow Body Hold')).toBeTruthy()
    expect(getByText('Broad Jump')).toBeTruthy()
  })

  it('shows exercise prescriptions (reps)', () => {
    const { getAllByText, getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
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
        onSkip={mockOnSkip}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    fireEvent.press(getByText('Start Workout'))
    expect(mockOnComplete).toHaveBeenCalledTimes(1)
  })

  it('"Skip Warmup" fires onSkip callback', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    fireEvent.press(getByText('Skip Warmup'))
    expect(mockOnSkip).toHaveBeenCalledTimes(1)
  })

  it('handles empty exercise list', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={[]}
        totalDuration={0}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Start Workout')).toBeTruthy()
  })

  it('shows duration info in flow mode', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        mode="flow"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText(/10 min/)).toBeTruthy()
  })

  it('preview mode renders collapsible state', () => {
    const { getByText } = render(
      <WarmupSection
        exercises={mockExercises}
        totalDuration={10}
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        mode="preview"
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('Warmup')).toBeTruthy()
    expect(getByText(/10 min/)).toBeTruthy()
  })
})
