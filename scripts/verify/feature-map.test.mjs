import fs from 'node:fs'
import path from 'node:path'
import { listWebFlows, root } from './flows.mjs'

// The verify-wander-fit feature map: one file per web flow, in pstack's
// four-section format, all linked from the index. Cursor and Codex read the
// same files through symlinks.
const skillDir = path.join(root, '.claude/skills/verify-wander-fit')
const featuresDir = path.join(skillDir, 'features')
const sections = ['Sub-features', 'How to get to it (user POV)', /^Driving it with .+/, 'Gotchas']

function featureFiles() {
  return fs
    .readdirSync(featuresDir)
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .sort()
}

function h2s(text) {
  return text
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3).trim())
}

describe('verify-wander-fit feature map', () => {
  it('has a feature file for every web flow', () => {
    const missing = listWebFlows().filter(
      (flow) => !fs.existsSync(path.join(featuresDir, `${flow}.md`))
    )
    expect(missing).toEqual([])
  })

  it('gives every feature file an H1 and exactly the four sections, in order', () => {
    const wrong = []
    for (const name of featureFiles()) {
      const text = fs.readFileSync(path.join(featuresDir, name), 'utf8')
      const headings = h2s(text)
      const ok =
        text.startsWith('# ') &&
        headings.length === sections.length &&
        sections.every((want, i) =>
          typeof want === 'string' ? headings[i] === want : want.test(headings[i])
        )
      if (!ok) wrong.push({ name, headings })
    }
    expect(wrong).toEqual([])
  })

  it('starts every Driving section with its preconditions', () => {
    const wrong = featureFiles().filter((name) => {
      const text = fs.readFileSync(path.join(featuresDir, name), 'utf8')
      const body = text.split(/^## Driving it with .+$/m)[1] || ''
      return !body.trimStart().startsWith('Preconditions:')
    })
    expect(wrong).toEqual([])
  })

  it('links every feature file from the index, and nothing that is missing', () => {
    const index = fs.readFileSync(path.join(featuresDir, 'README.md'), 'utf8')
    const linked = [...index.matchAll(/\]\(\.\/([^)]+\.md)\)/g)].map((match) => match[1])
    expect(featureFiles().filter((name) => !linked.includes(name))).toEqual([])
    expect(linked.filter((name) => !fs.existsSync(path.join(featuresDir, name)))).toEqual([])
  })

  it('has resolvable relative links between feature files', () => {
    const dead = []
    for (const name of featureFiles()) {
      const text = fs.readFileSync(path.join(featuresDir, name), 'utf8')
      for (const [, target] of text.matchAll(/\]\(\.\/([^)#]+)\)/g)) {
        if (!fs.existsSync(path.join(featuresDir, target))) dead.push(`${name} -> ${target}`)
      }
    }
    expect(dead).toEqual([])
  })

  it('is the same directory for Cursor and Codex', () => {
    for (const link of ['.cursor/skills/verify-wander-fit', '.agents/skills/verify-wander-fit']) {
      expect(fs.realpathSync(path.join(root, link))).toBe(fs.realpathSync(skillDir))
    }
  })

  it("keeps the skill's five required sections", () => {
    const headings = h2s(fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8'))
    const missing = ['Launch', 'Doctor', 'Drive', 'Evidence', 'Cleanup'].filter(
      (h) => !headings.includes(h)
    )
    expect(missing).toEqual([])
  })
})
