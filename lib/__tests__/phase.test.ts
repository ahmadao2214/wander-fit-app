import * as phase from '../phase'
import { PHASES, PHASE_NAMES, phaseTitle } from '../phase'

describe('phase glossary', () => {
  it('keeps the stored codes', () => {
    expect(PHASES).toEqual(['GPP', 'SPP', 'SSP'])
  })

  it('uses the approved expansions', () => {
    expect(PHASE_NAMES).toEqual({
      GPP: 'General Physical Preparedness',
      SPP: 'Specific Physical Preparedness',
      SSP: 'Sport-Specific Preparedness',
    })
  })

  it('formats a title with the abbreviation first', () => {
    expect(phaseTitle('SPP')).toBe('SPP: Specific Physical Preparedness')
  })
})

describe('phase colours (issue #210)', () => {
  it('are gone: the module exports names only', () => {
    expect(Object.keys(phase).sort()).toEqual(['PHASES', 'PHASE_NAMES', 'phaseTitle'].sort())
  })
})
