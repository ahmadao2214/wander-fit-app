// Builds index.html from template.html with the app's 27 sport animations inlined,
// so the prototype is one self-contained file. Run: node docs/first-run-v2/prototype/build.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const sports = join(here, '../../../assets/lottie/sports')
const lotties = {}
for (const f of readdirSync(sports).filter((f) => f.endsWith('.json'))) {
  lotties[f.slice(0, -5)] = JSON.parse(readFileSync(join(sports, f), 'utf8'))
}
const json = JSON.stringify(lotties).replace(/</g, '\\u003c')
const athlete = readFileSync(join(here, 'athlete.js'), 'utf8')
const html = readFileSync(join(here, 'template.html'), 'utf8').replace('/*LOTTIES*/', () => json).replace('/*ATHLETE*/', () => athlete)
writeFileSync(join(here, 'index.html'), html)
console.log(`index.html: ${Object.keys(lotties).length} animations, ${(html.length / 1024).toFixed(0)} KB`)
