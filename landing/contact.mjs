// Support form on /support. Posts JSON to the Convex `POST /contact` route.

const TOPICS = ['support', 'privacy', 'delete_account']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254
const ANY_CONTROL_CHAR = /\p{Cc}/u
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

/** The request body for the form's current values, or the first problem with them. */
export function readContact({ topic, email, message, website }) {
  const submitted = String(email ?? '')
  const cleanEmail = submitted.replace(/^ +| +$/g, '')
  const cleanMessage = String(message ?? '').trim()
  if (!TOPICS.includes(topic)) return { error: 'Choose what you need help with.', field: 'topic' }
  // Same rule as the server: refuse a control character, never clean it away.
  if (
    ANY_CONTROL_CHAR.test(submitted) ||
    cleanEmail.length > MAX_EMAIL_LENGTH ||
    !EMAIL.test(cleanEmail)
  ) {
    return { error: 'Enter a valid email address.', field: 'email' }
  }
  if (!cleanMessage) return { error: 'Tell us what you need.', field: 'message' }
  return { body: { topic, email: cleanEmail, message: cleanMessage, website: website ?? '' } }
}

/** `?preview=1` skips the POST, and only on a local server: never on the live site. */
export function isPreview({ hostname, search }) {
  return LOCAL_HOSTS.includes(hostname) && new URLSearchParams(search).get('preview') === '1'
}

function init() {
  const form = document.getElementById('contact-form')
  if (!form) return
  const done = document.getElementById('contact-done')
  const doneTitle = document.getElementById('contact-done-title')
  const doneBody = document.getElementById('contact-done-body')
  const errorEl = document.getElementById('contact-error')
  const submit = document.getElementById('contact-submit')
  const fields = {
    email: document.getElementById('contact-email'),
    message: document.getElementById('contact-message'),
  }
  const params = new URLSearchParams(location.search)
  const preview = isPreview(location)
  const endpoint = document.querySelector('meta[name="contact-endpoint"]')?.content ?? ''

  // /delete-account links here with the topic already chosen.
  const wanted = params.get('topic')
  if (TOPICS.includes(wanted)) {
    form.querySelector(`[name="topic"][value="${wanted}"]`).checked = true
  }

  const showError = (message, field) => {
    errorEl.textContent = message
    errorEl.hidden = false
    for (const [name, el] of Object.entries(fields)) {
      if (name === field) el.setAttribute('aria-invalid', 'true')
      else el.removeAttribute('aria-invalid')
    }
    fields[field]?.focus()
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (submit.disabled) return
    const data = new FormData(form)
    const result = readContact({
      topic: data.get('topic'),
      email: data.get('email'),
      message: data.get('message'),
      website: data.get('website'),
    })
    if (result.error) return showError(result.error, result.field)
    if (!preview && !endpoint) {
      return showError('The form is not available right now. Try again later.')
    }

    errorEl.hidden = true
    for (const el of Object.values(fields)) el.removeAttribute('aria-invalid')
    submit.disabled = true
    submit.textContent = 'Sending…'
    try {
      if (!preview) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.body),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || 'We could not send your request. Try again.')
        }
      } else {
        doneTitle.textContent = 'Preview only'
        doneBody.textContent = 'The request was not sent.'
      }
      form.hidden = true
      done.hidden = false
      done.focus()
    } catch (error) {
      const offline = error instanceof TypeError
      showError(
        offline
          ? 'We could not reach the server. Check your connection and try again.'
          : error.message
      )
    } finally {
      submit.disabled = false
      submit.textContent = 'Send request'
    }
  })

  // The button ships disabled so the form can't fall back to a plain GET,
  // which would put the email and message in the URL.
  submit.disabled = false
}

if (typeof document !== 'undefined') init()
