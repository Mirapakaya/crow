import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const dir = join(process.cwd(), 'src/i18n')
const files = (await readdir(dir)).filter((f) => f.endsWith('.ts') && f !== 'index.ts')

const extraKeys =
  `    forwardSecret: 'Forward secret',
    noForwardSecrecy: 'No forward secrecy',
    hybridPQ: 'Hybrid PQ',
    startSecret: 'Start secret chat',`

for (const file of files) {
  const path = join(dir, file)
  let content = await readFile(path, 'utf8')

  // Remove top-level duplicate keys if they were inserted outside the chat object.
  content = content.replace(
    /\n {4}forwardSecret:[^]*?startSecret: 'Start secret chat',\n/g,
    '\n',
  )

  // Insert the keys inside the chat object, before its closing " },".
  if (!content.includes('forwardSecret:')) {
    content = content.replace(
      /(chat: \{[^]*?encryptedNote:[^}]+?)(\s*\},)/,
      (m, before, after) => `${before},\n${extraKeys}${after}`,
    )
  }

  await writeFile(path, content)
  console.log(`updated ${file}`)
}
