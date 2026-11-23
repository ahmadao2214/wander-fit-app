import { Platform } from 'react-native'

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}))

// eslint-disable-next-line import/first
import * as Haptics from 'expo-haptics'
// eslint-disable-next-line import/first
import { selectionFeedback } from '../../lib/haptics'

const setOS = (os: typeof Platform.OS) =>
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true })
const original = Platform.OS

afterEach(() => {
  setOS(original)
  jest.clearAllMocks()
})

describe('selectionFeedback', () => {
  it('gives one light impact on iOS', () => {
    setOS('ios')
    selectionFeedback()
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1)
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light')
  })

  it('does nothing on web or Android', () => {
    setOS('web')
    selectionFeedback()
    setOS('android')
    selectionFeedback()
    expect(Haptics.impactAsync).not.toHaveBeenCalled()
  })

  it('swallows a haptics failure', async () => {
    setOS('ios')
    ;(Haptics.impactAsync as jest.Mock).mockReturnValueOnce(Promise.reject(new Error('no engine')))
    expect(() => selectionFeedback()).not.toThrow()
    await Promise.resolve()
  })
})
