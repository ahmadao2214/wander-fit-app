/** @jest-environment jsdom */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TextEncoder } from 'node:util'

global.TextEncoder = TextEncoder

test.each(['success', 'http-error', 'network-error'])(
  'a superseded signup leaves the current form alone after %s',
  async (outcome) => {
    document.documentElement.innerHTML = readFileSync(join(__dirname, 'index.html'), 'utf8')
    localStorage.clear()
    window.matchMedia = () => ({ matches: true })
    HTMLElement.prototype.scrollIntoView = jest.fn()
    const requests = []
    global.fetch = jest.fn(
      () => new Promise((resolve, reject) => requests.push({ resolve, reject }))
    )
    jest.resetModules()
    await import('./app.mjs')
    const element = (id) => document.getElementById(id)
    const submit = (email) => {
      element('email').value = email
      document.querySelector('[value="free_beta_only"]').click()
      element('submit').click()
    }
    document.querySelector('[data-open-form]').click()
    submit('first@example.test')
    document.querySelector('#onramp [data-show-access]').click()
    element('again').click()
    expect(element('submit').disabled).toBe(false)
    submit('second@example.test')
    if (outcome === 'network-error') requests[0].reject(new Error('Offline'))
    else requests[0].resolve({ ok: outcome === 'success', json: async () => ({ error: 'Retry' }) })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(element('onramp').hidden).toBe(false)
    expect(element('form-err').hidden).toBe(true)
    expect(element('submit').disabled).toBe(true)
    expect(element('email').value).toBe('second@example.test')
    requests[1].resolve({ ok: true })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(element('access').hidden).toBe(false)
  }
)
