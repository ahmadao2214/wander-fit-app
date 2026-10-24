import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'

import config from '../../tamagui.config'
import { ExerciseAccordionItem } from '../ExerciseAccordionItem'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

describe('ExerciseAccordionItem', () => {
  it('shows swapped exercise messaging for equipment variants', () => {
    render(
      <ExerciseAccordionItem
        exercise={{
          exerciseId: 'exercise-1',
          sets: 3,
          reps: '8',
          restSeconds: 90,
          orderIndex: 0,
          exercise: {
            _id: 'goblet-squat',
            name: 'Goblet Squat',
            instructions: 'Keep chest tall.',
            tags: ['lower_body'],
          },
          sourceExercise: {
            _id: 'back-squat',
            name: 'Back Squat',
          },
          equipmentMode: 'home',
          hasEquipmentAlternative: true,
          isEquipmentSwapped: true,
        }}
        index={0}
        isExpanded={true}
        onToggle={jest.fn()}
        intensityColor="$blue9"
      />,
      { wrapper: AllTheProviders }
    )

    expect(screen.getByText('SWAPPED')).toBeTruthy()
    expect(screen.getByText('Home mode')).toBeTruthy()
    expect(screen.getByText('Swapped for your home setup')).toBeTruthy()
    expect(
      screen.getByText('Back Squat was replaced with Goblet Squat.')
    ).toBeTruthy()
  })
})
