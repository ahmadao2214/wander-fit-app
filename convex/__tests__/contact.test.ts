import { convexTest } from 'convex-test'
import schema from '../schema'
import { internal } from '../_generated/api'
import { cleanContact, MAX_MESSAGE_LENGTH } from '../contact'
import { convexModules } from '../../jest/convexModules'

const modules = convexModules()

const request = {
  topic: 'delete_account',
  email: ' Parent@Example.test ',
  message: "Please delete my daughter's account.\nHer email is maya@example.test.",
}

describe('cleanContact', () => {
  it('normalizes the email and keeps line breaks in the message', () => {
    expect(cleanContact(request)).toEqual({
      ok: true,
      value: {
        topic: 'delete_account',
        email: 'parent@example.test',
        message: "Please delete my daughter's account.\nHer email is maya@example.test.",
      },
    })
  })

  it.each([
    ['a body that is not an object', 'text', 'Send the request as JSON.'],
    ['an unknown topic', { ...request, topic: 'sales' }, 'Choose what you need help with.'],
    ['a bad email', { ...request, email: 'parent@' }, 'Enter a valid email address.'],
    ['an empty message', { ...request, message: ' \n ' }, 'Tell us what you need.'],
  ])('rejects %s', (_name, body, error) => {
    expect(cleanContact(body)).toEqual({ ok: false, error })
  })

  it('drops a filled honeypot as spam', () => {
    expect(cleanContact({ ...request, website: 'https://spam.test' })).toEqual({
      ok: false,
      spam: true,
    })
  })

  it('cuts a long message and strips control characters', () => {
    const result = cleanContact({ ...request, message: `a\u0000b${'x'.repeat(5000)}` })
    expect(result.ok && result.value.message.startsWith('ab')).toBe(true)
    expect(result.ok && result.value.message.length).toBe(MAX_MESSAGE_LENGTH)
  })
})

describe('record', () => {
  it('saves the request as open', async () => {
    const t = convexTest(schema, modules)
    const cleaned = cleanContact(request)
    if (!cleaned.ok) throw new Error('expected a valid request')
    await t.mutation(internal.contact.record, cleaned.value)
    const rows = await t.run((ctx) => ctx.db.query('contact_requests').collect())
    expect(rows.map(({ topic, email, status }) => ({ topic, email, status }))).toEqual([
      { topic: 'delete_account', email: 'parent@example.test', status: 'open' },
    ])
  })
})
