import { createElement } from 'react'
import { FRAME } from './contract'
import { renderFirstRun } from '../../lib/firstRunBoard'
import { SCHEMES, SPORTS, type Scheme, type Sport } from '../../lib/sportTokens'

function phone(sport: Sport, scheme: Scheme, reduced = false) {
  return createElement('iframe', {
    title: `First Run ${sport} ${scheme}`,
    srcDoc: renderFirstRun(sport, scheme, reduced),
    style: { width: FRAME.width, height: FRAME.height, border: '0' },
  })
}

const meta = { title: 'Redesign/First Run' }
export default meta

export const BasketballDark = () => phone('basketball', 'chalkboard')
export const BasketballLight = () => phone('basketball', 'whiteboard')
export const SoccerDark = () => phone('soccer', 'chalkboard')
export const SoccerLight = () => phone('soccer', 'whiteboard')
export const TrackDark = () => phone('track', 'chalkboard')
export const TrackLight = () => phone('track', 'whiteboard')
export const Reduced = () => phone('basketball', 'chalkboard', true)

export const sports = SPORTS
export const schemes = SCHEMES
