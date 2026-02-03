import { mkdir, copyFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const srcIcon = resolve(repoRoot, 'src', 'assets', 'image.png')

const outputs = [
  resolve(repoRoot, 'public', 'favicon.png'),
  resolve(repoRoot, 'public', 'image.png'),
]

async function main() {
  for (const outPath of outputs) {
    await mkdir(dirname(outPath), { recursive: true })
    await copyFile(srcIcon, outPath)
  }
}

main().catch((err) => {
  console.error('[sync-icons] Failed to sync icons:', err)
  process.exit(1)
})
