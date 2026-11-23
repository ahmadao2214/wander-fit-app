import { mcpAddress } from '../mcpAddress'

describe('mcpAddress', () => {
  it('maps the app deployment to its MCP endpoint', () => {
    expect(mcpAddress('https://accomplished-tapir-54.convex.cloud')).toBe(
      'https://accomplished-tapir-54.convex.site/mcp'
    )
  })

  it('returns nothing it cannot derive', () => {
    expect(mcpAddress(undefined)).toBeNull()
    expect(mcpAddress('not a url')).toBeNull()
    expect(mcpAddress('http://127.0.0.1:3210')).toBeNull()
  })
})
