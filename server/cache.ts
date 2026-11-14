// Saves finished graphs in server/.cache/, one JSON file per paper, keyed by a
// hash of the page text and PROMPT_VERSION. Related-work lookups are saved there
// too, for a week. Used by index.ts.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PageText, PaperGraph } from '../shared/graph.ts'
import type { RelatedRequest, RelatedWork } from '../shared/related.ts'
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

// ---- Related work (Semantic Scholar results), cached the same way ----

export type RelatedCacheEntry = {
  related: RelatedWork
  createdAt: string
}

// Results older than this are fetched again, since new papers and citations appear.
const RELATED_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function relatedCacheKey(request: RelatedRequest): string {
  return (
    'related-' +
    createHash('sha256')
      .update(JSON.stringify([request.title, request.firstPage, request.topic ?? '']))
      .digest('hex')
  )
}

export async function readRelatedCache(key: string): Promise<RelatedWork | null> {
  try {
    const entry: RelatedCacheEntry = JSON.parse(await readFile(join(CACHE_DIR, `${key}.json`), 'utf8'))
    if (Date.now() - new Date(entry.createdAt).getTime() > RELATED_MAX_AGE_MS) return null
    return entry.related
  } catch {
    return null
  }
}

export async function writeRelatedCache(key: string, related: RelatedWork): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true })
    const entry: RelatedCacheEntry = { related, createdAt: new Date().toISOString() }
    await writeFile(join(CACHE_DIR, `${key}.json`), JSON.stringify(entry, null, 2))
  } catch (error) {
    console.warn('Could not write cache:', error)
  }
}
