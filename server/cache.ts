// Saves finished graphs in server/.cache/, one JSON file per paper, keyed by a
// hash of the page text and PROMPT_VERSION. Used by index.ts.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PageText, PaperGraph } from '../shared/graph.ts'
import { PROMPT_VERSION } from './extraction/prompt.ts'

// Finished graphs are saved here, one JSON file per paper, so the same paper
// never costs a second API call.
const CACHE_DIR = join(import.meta.dirname, '.cache')

export type CacheEntry = {
  graph: PaperGraph
  model: string
  createdAt: string
}

// Same paper text + same prompt version = same key.
export function cacheKey(pages: PageText[]): string {
  return createHash('sha256')
    .update(`v${PROMPT_VERSION}\n${JSON.stringify(pages)}`)
    .digest('hex')
}

export async function readCache(key: string): Promise<CacheEntry | null> {
  try {
    return JSON.parse(await readFile(join(CACHE_DIR, `${key}.json`), 'utf8'))
  } catch {
    return null
  }
}

export async function writeCache(key: string, entry: CacheEntry): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(join(CACHE_DIR, `${key}.json`), JSON.stringify(entry, null, 2))
  } catch (error) {
    // A failed cache write shouldn't fail the request.
    console.warn('Could not write cache:', error)
  }
}
