import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readContact } from './contact.mjs'
import { legalUrls } from '../lib/legal'

const PAGES = ['privacy', 'terms', 'refunds', 'support', 'delete-account']
const html = (page) => readFileSync(join(__dirname, page, 'index.html'), 'utf8')

describe('policy and support pages', () => {
  it('has a page for every URL the app opens', () => {
    const paths = Object.values(legalUrls('')).map((url) => url.slice(1))
    expect(paths.filter((path) => !existsSync(join(__dirname, path, 'index.html')))).toEqual([])
  })

  it.each(PAGES)('%s has no unfilled placeholder or review marker', (page) => {
    expect(html(page).match(/\{\{|\}\}|ATTORNEY REVIEW|\[Your Name\]|mailto:/g)).toBeNull()
  })

  it.each([...PAGES, '.'])('%s links only to pages and files that exist', (page) => {
    const source = page === '.' ? readFileSync(join(__dirname, 'index.html'), 'utf8') : html(page)
    const links = [...source.matchAll(/(?:href|src)="\/([^"#?]*)/g)].map((m) => m[1])
    const missing = links.filter(
      (link) => link && !existsSync(join(__dirname, link)) && !PAGES.includes(link)
    )
    expect(missing).toEqual([])
  })
})

describe('readContact', () => {
  const valid = {
    topic: 'delete_account',
    email: ' parent@example.test ',
    message: ' Please delete. ',
  }

  it('trims a valid request', () => {
    expect(readContact(valid)).toEqual({
      body: {
        topic: 'delete_account',
        email: 'parent@example.test',
        message: 'Please delete.',
        website: '',
      },
    })
  })

  it.each([
    [{ ...valid, topic: 'other' }, 'topic'],
    [{ ...valid, email: 'not-an-email' }, 'email'],
    [{ ...valid, email: '\tparent@example.test' }, 'email'],
    [{ ...valid, email: 'parent@example.test\n' }, 'email'],
    [{ ...valid, email: 'par\u0085ent@example.test' }, 'email'],
    [{ ...valid, email: 'parent@exa\u200bmple.test' }, 'email'],
    [{ ...valid, email: `${'a'.repeat(250)}@example.museum` }, 'email'],
    [{ ...valid, message: '   ' }, 'message'],
  ])('names the field that is wrong', (input, field) => {
    expect(readContact(input).field).toBe(field)
  })
})
