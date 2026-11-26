import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'
import { SPORT_SCHEMES, paint, sportPaint } from '../../jest/sportPaint'

let mockScheme: 'chalkboard' | 'whiteboard' = 'whiteboard'
jest.mock('../../hooks/useSportScheme', () => ({ useSportScheme: () => mockScheme }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { _id: 'u1' }, isLoading: false }) }))
jest.mock('../../components/calendar', () => ({ WorkoutCalendar: () => null }))
jest.mock('../../components/program/ProgramSeasonHeader', () => ({ ProgramSeasonHeader: () => null }))
// The play is an svg string; keep the string so the test can read what is drawn
jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual('react-native')
  return { SvgXml: ({ xml }: { xml: string }) => <View testID="program-play" accessibilityHint={xml} /> }
})

// eslint-disable-next-line import/first
import ProgramPage from '../(athlete)/program'

const wrapper = ({ children }: { children: React.ReactNode }) => <TamaguiProvider config={config}>{children}</TamaguiProvider>

describe('Program board', () => {
  afterEach(() => {
    mockScheme = 'whiteboard'
  })

  it.each(SPORT_SCHEMES)('sets the %s board surface as its own ground', (scheme) => {
    mockScheme = scheme
    const { getByTestId } = render(<ProgramPage />, { wrapper })
    expect(paint(getByTestId('program-screen')).backgroundColor).toBe(sportPaint(scheme).board)
  })

  it.each(SPORT_SCHEMES)('shows the %s play already drawn: three marker paths, no motion, no athlete, no score', (scheme) => {
    mockScheme = scheme
    const { getByTestId } = render(<ProgramPage />, { wrapper })
    const xml: string = getByTestId('program-play', { includeHiddenElements: true }).props.accessibilityHint
    const colors = sportPaint(scheme)
    const paths = xml.match(/<path [^>]*>/g) ?? []
    expect(paths).toHaveLength(3)
    for (const path of paths) {
      expect([path.includes(`stroke="${colors.marker}"`), path.includes('stroke-width="2.8"')]).toEqual([true, true])
    }
    expect(xml).toContain(`fill="${colors.board}"`)
    expect(xml).not.toMatch(/<animate|<circle|SCORE/)
  })

  it('leaves the board out of touch and the screen reader', () => {
    const { getByTestId } = render(<ProgramPage />, { wrapper })
    const board = getByTestId('program-board', { includeHiddenElements: true })
    expect([board.props.pointerEvents, board.props.accessibilityElementsHidden]).toEqual(['none', true])
  })
})
