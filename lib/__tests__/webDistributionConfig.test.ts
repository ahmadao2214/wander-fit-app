import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')

function readUtf8(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8')
}

describe('web distribution and Cloudflare Pages SPA configuration', () => {
  it('exports web as a single-page application so dynamic workout routes survive refresh and direct links', () => {
    const appJson = JSON.parse(readUtf8('app.json'))
    expect(appJson.expo.web.output).toBe('single')
    expect(appJson.expo.web.bundler).toBe('metro')
    expect(appJson.expo.web.name).toBe('WanderFit')
  })

  it('provides a mobile-ready SPA HTML template and removes unused static +html.tsx', () => {
    const html = readUtf8('public/index.html')
    expect(html).toContain('lang="%LANG_ISO_CODE%"')
    expect(html).toContain('<title>%WEB_TITLE%</title>')
    expect(html).toContain('viewport-fit=cover')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('id="expo-reset"')
    expect(html).toContain('prefers-color-scheme: dark')
    expect(html).toContain('<div id="root"></div>')
    expect(fs.existsSync(path.join(ROOT, 'public/apple-touch-icon.png'))).toBe(true)
    expect(fs.existsSync(path.join(ROOT, 'app/+html.tsx'))).toBe(false)
  })

  it('leaves SPA fallback to Cloudflare Pages and sets security headers', () => {
    expect(fs.existsSync(path.join(ROOT, 'public/404.html'))).toBe(false)

    const headers = readUtf8('public/_headers')
    expect(headers).toContain('X-Content-Type-Options: nosniff')
    expect(headers).toContain('X-Frame-Options: DENY')
  })

  it('auto-increments the remote version for Android preview APKs', () => {
    const config = JSON.parse(readUtf8('eas.json'))
    expect(config.cli.appVersionSource).toBe('remote')
    expect(config.build.preview).toMatchObject({
      autoIncrement: true,
      distribution: 'internal',
      android: { buildType: 'apk' },
    })
  })

  it('declares only existing routes in the root Stack layout (no stale route warnings)', () => {
    const rootLayout = readUtf8('app/_layout.tsx')
    const screenNames = Array.from(
      rootLayout.matchAll(/<Stack\.Screen[\s\S]*?\bname=["']([^"']+)["']/g)
    ).map((match) => match[1])
    expect(screenNames.length).toBeGreaterThan(0)

    const missing = screenNames.filter((name) => {
      const groupDir = path.join(ROOT, 'app', name)
      const tsxFile = path.join(ROOT, 'app', `${name}.tsx`)
      const tsFile = path.join(ROOT, 'app', `${name}.ts`)
      return !(fs.existsSync(groupDir) || fs.existsSync(tsxFile) || fs.existsSync(tsFile))
    })

    expect(missing).toEqual([])
  })
})
