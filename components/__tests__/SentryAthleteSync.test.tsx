import React from 'react'
import { render } from '@testing-library/react-native'

let mockAuthState: { isSignedIn: boolean; userId: string | null } = {
  isSignedIn: false,
  userId: null,
}
const mockSetSentryAthleteContext = jest.fn()

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => mockAuthState,
}))

jest.mock('../../lib/sentry', () => ({
  setSentryAthleteContext: (...args: unknown[]) => mockSetSentryAthleteContext(...args),
}))

import { SentryAthleteSync } from '../SentryAthleteSync'

describe('SentryAthleteSync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthState = { isSignedIn: false, userId: null }
  })

  it('clears Sentry athlete context when signed out', () => {
    render(<SentryAthleteSync />)
    expect(mockSetSentryAthleteContext).toHaveBeenCalledWith(null)
  })

  it('syncs only the pseudonymous userId when signed in and clears on sign-out', () => {
    mockAuthState = { isSignedIn: true, userId: 'user_opaque_42' }
    const { rerender } = render(<SentryAthleteSync />)
    expect(mockSetSentryAthleteContext).toHaveBeenCalledWith('user_opaque_42')

    mockAuthState = { isSignedIn: false, userId: null }
    rerender(<SentryAthleteSync />)
    expect(mockSetSentryAthleteContext).toHaveBeenLastCalledWith(null)
  })
})
