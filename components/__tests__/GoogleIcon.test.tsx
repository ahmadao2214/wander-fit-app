import React from 'react'
import { render } from '@testing-library/react-native'
import Svg, { Path } from 'react-native-svg'
import { GoogleIcon } from '../GoogleIcon'

describe('GoogleIcon', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<GoogleIcon />)
    expect(toJSON()).toBeTruthy()
  })

  it('renders with default size', () => {
    const { UNSAFE_getByType } = render(<GoogleIcon />)
    const svg = UNSAFE_getByType(Svg)
    expect(svg.props.width).toBe(20)
    expect(svg.props.height).toBe(20)
  })

  it('renders with custom size', () => {
    const customSize = 32
    const { UNSAFE_getByType } = render(<GoogleIcon size={customSize} />)
    expect(UNSAFE_getByType(Svg).props.width).toBe(customSize)
  })

  it('renders all Google logo paths', () => {
    const { UNSAFE_getAllByType } = render(<GoogleIcon />)
    // Google logo should have 4 colored paths (blue, green, yellow, red)
    expect(UNSAFE_getAllByType(Path)).toHaveLength(4)
  })

  it('has correct Google brand colors', () => {
    const { UNSAFE_getAllByType } = render(<GoogleIcon />)

    // Check that paths have Google's brand colors
    const colors = UNSAFE_getAllByType(Path).map((path) => path.props.fill)

    expect(colors).toContain('#4285F4') // Blue
    expect(colors).toContain('#34A853') // Green
    expect(colors).toContain('#FBBC05') // Yellow
    expect(colors).toContain('#EA4335') // Red
  })

  it('maintains aspect ratio with custom size', () => {
    const size = 40
    const { UNSAFE_getByType } = render(<GoogleIcon size={size} />)
    const svg = UNSAFE_getByType(Svg)

    // SVG should have equal width and height
    expect(svg.props.width).toBe(size)
    expect(svg.props.height).toBe(size)
  })
})
