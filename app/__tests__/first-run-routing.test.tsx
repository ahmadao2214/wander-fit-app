import React from 'react'
import { act, render, screen } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'
import { createDraftStore, type DraftStorage } from '../../lib/firstRunDraft'

const mockAuth = {
  isLoading: false,
  isAuthenticated: false,
  user: null as null | { intakeCompletedAt?: number },
}
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => mockAuth }))

const memory = new Map<string, string>()
const storage: DraftStorage = {
  getItem: async (k) => memory.get(k) ?? null,
  setItem: async (k, v) => {
    memory.set(k, v)
  },
  removeItem: async (k) => {
    memory.delete(k)
  },
}
let mockStore = createDraftStore(storage, () => 1000)
jest.mock('../../lib/firstRunStorage', () => ({
  get firstRunDraft() {
    return mockStore
  },
}))

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native')
  return { Redirect: ({ href }: { href: string }) => <Text testID="redirect">{href}</Text> }
})

// eslint-disable-next-line import/first
import IndexPage from '../index'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

async function renderRoot() {
  render(<IndexPage />, { wrapper })
  await act(async () => {})
}

beforeEach(() => {
  memory.clear()
  mockStore = createDraftStore(storage, () => 1000)
  Object.assign(mockAuth, { isLoading: false, isAuthenticated: false, user: null })
})

describe('root routing', () => {
  it('opens a fresh install on the First Run promise', async () => {
    await renderRoot()
    expect(screen.getByTestId('redirect').props.children).toBe('/(first-run)')
  })

  it('reopens a draft on the step it reached', async () => {
    await createDraftStore(storage, () => 1000).save({
      answers: { sportId: 's1' },
      lastStep: 'about',
    })
    await renderRoot()
    expect(screen.getByTestId('redirect').props.children).toBe('/(first-run)/about')
  })

  it('sends a signed-in athlete with a program to the tabs, never the First Run', async () => {
    await createDraftStore(storage, () => 1000).save({ lastStep: 'days' })
    Object.assign(mockAuth, { isAuthenticated: true, user: { intakeCompletedAt: 1 } })
    await renderRoot()
    expect(screen.getByTestId('redirect').props.children).toBe('/(athlete)')
  })

  it('shows a spinner while auth is loading', async () => {
    Object.assign(mockAuth, { isLoading: true })
    await renderRoot()
    expect(screen.queryByTestId('redirect')).toBeNull()
    expect(screen.getByTestId('root-loading')).toBeTruthy()
  })
})
