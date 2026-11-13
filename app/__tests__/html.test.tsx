import React from 'react'
import { act, create } from 'react-test-renderer'
import Root from '../+html'

jest.mock('expo-router/html', () => ({
  ScrollViewStyleReset: () => null,
  useServerDocumentContext: () => ({
    htmlAttributes: { dir: 'ltr' },
    bodyAttributes: { className: 'router-document' },
    headNodes: <link rel="stylesheet" href="/_expo/static/app.css" />,
    bodyNodes: <script src="/_expo/static/app.js" />,
  }),
}))

describe('custom web document', () => {
  it('preserves Router hydration assets and document attributes', async () => {
    let document: ReturnType<typeof create>
    await act(async () => {
      document = create(<Root><main>Screen content</main></Root>)
    })

    expect(document!.root.findByType('html').props.dir).toBe('ltr')
    expect(document!.root.findByType('html').props.lang).toBe('en')
    expect(document!.root.findByType('body').props.className).toBe('router-document')
    expect(document!.root.findByType('link').props.href).toBe('/_expo/static/app.css')
    expect(document!.root.findByType('script').props.src).toBe('/_expo/static/app.js')
    expect(document!.root.findByType('main').props.children).toBe('Screen content')

    await act(async () => document!.unmount())
  })
})
