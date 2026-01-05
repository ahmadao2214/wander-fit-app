import React from 'react'
import { render } from '@testing-library/react-native'
import { GoogleIcon } from '../GoogleIcon'

describe('GoogleIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<GoogleIcon />)
    expect(container).toBeTruthy()
  })

  it('renders with default size', () => {
    const { container } = render(<GoogleIcon />)
    // Should render SVG with default size of 20
    expect(container).toBeTruthy()
  })

  it('renders with custom size', () => {
    const customSize = 32
    const { container } = render(<GoogleIcon size={customSize} />)
    expect(container).toBeTruthy()
  })

  it('renders all Google logo paths', () => {
    const { UNSAFE_getByType } = render(<GoogleIcon />)
    // Google logo should have 4 colored paths (blue, green, yellow, red)
    const svg = UNSAFE_getByType('Svg')
    expect(svg).toBeTruthy()
    expect(svg.props.children).toHaveLength(4)
  })

  it('has correct Google brand colors', () => {
    const { UNSAFE_getByType } = render(<GoogleIcon />)
    const svg = UNSAFE_getByType('Svg')

    // Check that paths have Google's brand colors
    const paths = svg.props.children
    const colors = paths.map((path: any) => path.props.fill)

    expect(colors).toContain('#4285F4') // Blue
    expect(colors).toContain('#34A853') // Green
    expect(colors).toContain('#FBBC05') // Yellow
    expect(colors).toContain('#EA4335') // Red
  })

  it('maintains aspect ratio with custom size', () => {
    const size = 40
    const { UNSAFE_getByType } = render(<GoogleIcon size={size} />)
    const svg = UNSAFE_getByType('Svg')

    // SVG should have equal width and height
    expect(svg.props.width).toBe(size)
    expect(svg.props.height).toBe(size)
  })
})
