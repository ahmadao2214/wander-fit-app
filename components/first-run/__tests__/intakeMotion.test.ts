jest.mock('react-native-reanimated', () => jest.requireActual('../../../jest/reanimatedMock'))

// eslint-disable-next-line import/first
import { intakeMotion } from '../intakeMotion'

describe('intakeMotion', () => {
  it('turns pages on iOS, crossfades on web, and holds still with Reduce Motion', () => {
    expect(intakeMotion('ios', false)).toEqual({ moving: true, pageTurn: 'slide', known: true })
    expect(intakeMotion('web', false)).toEqual({ moving: true, pageTurn: 'fade', known: true })
    expect(intakeMotion('ios', true)).toEqual({ moving: false, pageTurn: 'none', known: true })
  })

  it('treats an unknown Reduce Motion answer as on until it arrives', () => {
    expect(intakeMotion('ios', null)).toEqual({ moving: false, pageTurn: 'none', known: false })
  })
})
