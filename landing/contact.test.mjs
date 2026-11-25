/** @jest-environment jsdom */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const page = readFileSync(join(__dirname, 'support', 'index.html'), 'utf8')
const element = (id) => document.getElementById(id)
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

async function load({ url = 'https://wanderfit-beta.vercel.app/support', endpoint } = {}) {
  window.history.replaceState({}, '', new URL(url).pathname + new URL(url).search)
  document.documentElement.innerHTML = page
  if (endpoint !== undefined) {
    document.querySelector('meta[name="contact-endpoint"]').content = endpoint
  }
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }))
  jest.resetModules()
  return import('./contact.mjs')
}

function fill() {
  element('contact-email').value = 'parent@example.test'
  element('contact-message').value = 'Please delete the account.'
}

test('the button is disabled in the page source, so the form cannot submit as a plain GET', () => {
  document.documentElement.innerHTML = page
  expect(element('contact-submit').disabled).toBe(true)
  expect(element('contact-form').method).toBe('post')
})

test('a valid request is posted once and confirmed', async () => {
  await load({ url: 'https://wanderfit-beta.vercel.app/support?topic=delete_account' })
  expect(element('contact-submit').disabled).toBe(false)
  fill()
  element('contact-submit').click()
  element('contact-submit').click()
  await settle()
  expect(global.fetch).toHaveBeenCalledTimes(1)
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
    topic: 'delete_account',
    email: 'parent@example.test',
    message: 'Please delete the account.',
    website: '',
  })
  expect(element('contact-done').hidden).toBe(false)
  expect(element('contact-done-title').textContent).toBe('Request sent')
})

// jsdom serves the page from localhost, which is where preview is allowed.
test('?preview=1 on localhost sends nothing and says so', async () => {
  await load({ url: 'http://localhost/support?preview=1' })
  fill()
  element('contact-submit').click()
  await settle()
  expect(global.fetch).not.toHaveBeenCalled()
  expect(element('contact-done-title').textContent).toBe('Preview only')
  expect(element('contact-done-body').textContent).toBe('The request was not sent.')
})

test('a missing endpoint shows an error, not a confirmation', async () => {
  await load({ endpoint: '' })
  fill()
  element('contact-submit').click()
  await settle()
  expect(global.fetch).not.toHaveBeenCalled()
  expect(element('contact-done').hidden).toBe(true)
  expect(element('contact-error').hidden).toBe(false)
})

test('a server error keeps the form and what was typed', async () => {
  await load()
  global.fetch = jest.fn(async () => ({
    ok: false,
    json: async () => ({ error: 'Too many requests.' }),
  }))
  fill()
  element('contact-submit').click()
  await settle()
  expect(element('contact-error').textContent).toBe('Too many requests.')
  expect(element('contact-message').value).toBe('Please delete the account.')
  expect(element('contact-submit').disabled).toBe(false)
})

test('preview never applies on the live site', async () => {
  const { isPreview } = await load()
  expect(isPreview({ hostname: 'localhost', search: '?preview=1' })).toBe(true)
  expect(isPreview({ hostname: 'localhost', search: '?preview=0' })).toBe(false)
  expect(isPreview({ hostname: 'wanderfit-beta.vercel.app', search: '?preview=1' })).toBe(false)
})
