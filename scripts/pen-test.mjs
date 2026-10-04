#!/usr/bin/env node
/**
 * Crow pen-test runner.
 *
 * Runs the static-analysis tool block from docs/PENTEST-REPORT.md.
 * Designed for a GitHub Codespace on the S1011H branch.
 *
 * Usage:
 *   node scripts/pen-test.mjs
 *
 * The script exits with the number of failing tools (0 = clean).
 */

import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const run = (label, command) => {
  console.log(`\n=== ${label} ===`)
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
    return { label, ok: true, output: output.trim() }
  } catch (err) {
    return { label, ok: false, output: err.stdout?.toString?.() || err.message }
  }
}

const results = []

results.push(run('npm audit', 'npm audit --omit=dev'))
results.push(run('semgrep', 'npx semgrep --config p/typescript --config p/react --config p/security-audit --config p/secrets src'))
results.push(run('osv-scanner', 'npx osv-scanner --recursive .'))
results.push(run('gitleaks', 'npx gitleaks detect --source . --verbose'))

const report = results
  .map((r) => `## ${r.label}\n\n\`\`\`\n${r.output}\n\`\`\`\n`)
  .join('\n')

writeFileSync('pen-test-results.md', `# Pen-test tool results\n\n${report}`)

const failed = results.filter((r) => !r.ok).length
if (failed === 0) {
  console.log('\nAll pen-test tools passed.')
} else {
  console.log(`\n${failed} tool(s) reported findings. See pen-test-results.md.`)
}
process.exit(failed)
