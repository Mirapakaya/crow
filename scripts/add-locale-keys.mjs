import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const dir = join(process.cwd(), 'src/i18n')
const files = (await readdir(dir)).filter((f) => f.endsWith('.ts') && f !== 'index.ts')

for (const file of files) {
  const path = join(dir, file)
  let content = await readFile(path, 'utf8')

  // Add filterContacts after filterGroups if missing
  if (!content.includes('filterContacts')) {
    content = content.replace(
      /filterGroups:[^,]+,/,
      (m) => `${m}\n    filterContacts: 'Contacts',`
    )
  }

  // Add delete after pinned if missing
  if (!content.includes('delete:')) {
    content = content.replace(
      /pinned:[^,]+,/,
      (m) => `${m}\n    delete: 'Delete',`
    )
  }

  // Add forward-secrecy UI keys after encryptedNote if missing
  if (!content.includes('forwardSecret:')) {
    content = content.replace(
      /encryptedNote:[^,]+,/,
      (m) => `${m}\n    forwardSecret: 'Forward secret',\n    noForwardSecrecy: 'No forward secrecy',\n    hybridPQ: 'Hybrid PQ',\n    startSecret: 'Start secret chat',`
    )
  }

  await writeFile(path, content)
  console.log(`updated ${file}`)
}
