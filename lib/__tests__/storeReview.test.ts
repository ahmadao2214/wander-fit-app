let mockOs: 'ios' | 'android' | 'web' = 'ios'

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockOs
    },
  },
}))

const mockIsAvailableAsync = jest.fn()
const mockRequestReview = jest.fn()

jest.mock('expo-store-review', () => ({
  isAvailableAsync: (...args: unknown[]) => mockIsAvailableAsync(...args),
  requestReview: (...args: unknown[]) => mockRequestReview(...args),
}))

import { isStoreReviewEnabledByEnv, requestNativeStoreReview } from '../storeReview'

describe('storeReview adapter', () => {
  const originalFlag = process.env.EXPO_PUBLIC_ENABLE_STORE_REVIEW

  beforeEach(() => {
    jest.clearAllMocks()
    mockOs = 'ios'
    delete process.env.EXPO_PUBLIC_ENABLE_STORE_REVIEW
  })

  afterAll(() => {
    if (originalFlag === undefined) {
      delete process.env.EXPO_PUBLIC_ENABLE_STORE_REVIEW
    } else {
      process.env.EXPO_PUBLIC_ENABLE_STORE_REVIEW = originalFlag
    }
  })

  it('stays disabled when EXPO_PUBLIC_ENABLE_STORE_REVIEW is not true (TestFlight/preview guard)', async () => {
    expect(isStoreReviewEnabledByEnv()).toBe(false)
    expect(await requestNativeStoreReview()).toBe(false)
    expect(mockRequestReview).not.toHaveBeenCalled()
  })

  it('stays disabled on web even when env flag is true', async () => {
    mockOs = 'web'
    process.env.EXPO_PUBLIC_ENABLE_STORE_REVIEW = 'true'
    expect(isStoreReviewEnabledByEnv()).toBe(false)
    expect(await requestNativeStoreReview()).toBe(false)
    expect(mockRequestReview).not.toHaveBeenCalled()
  })

  it('invokes native requestReview when enabled and available on iOS/Android', async () => {
    process.env.EXPO_PUBLIC_ENABLE_STORE_REVIEW = 'true'
    mockIsAvailableAsync.mockResolvedValue(true)
    mockRequestReview.mockResolvedValue(undefined)

    expect(await requestNativeStoreReview()).toBe(true)
    expect(mockIsAvailableAsync).toHaveBeenCalledTimes(1)
    expect(mockRequestReview).toHaveBeenCalledTimes(1)
  })

  it('returns false gracefully when native API reports unavailable or throws', async () => {
    process.env.EXPO_PUBLIC_ENABLE_STORE_REVIEW = 'true'
    mockIsAvailableAsync.mockResolvedValue(false)
    expect(await requestNativeStoreReview()).toBe(false)

    mockIsAvailableAsync.mockRejectedValue(new Error('Native module missing'))
    expect(await requestNativeStoreReview()).toBe(false)
  })

  it('skips requestReview when shouldProceed returns false after isAvailableAsync settles', async () => {
    process.env.EXPO_PUBLIC_ENABLE_STORE_REVIEW = 'true'
    mockIsAvailableAsync.mockResolvedValue(true)

    expect(await requestNativeStoreReview({ shouldProceed: () => false })).toBe(false)
    expect(mockRequestReview).not.toHaveBeenCalled()
  })
})
