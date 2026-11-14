// The API server (Express, port 3001). POST /api/extract turns a paper's page text
// into a claims-and-evidence graph; POST /api/related finds related work on
// Semantic Scholar. Both are served from the cache when possible.
import express from 'express'
import {
  cacheKey,
  readCache,
  readRelatedCache,
  relatedCacheKey,
  writeCache,
  writeRelatedCache,
} from './cache.ts'
import { extractGraph } from './extraction/gemini.ts'
import { findRelatedWork, RelatedBusyError } from './related/semanticScholar.ts'

const PORT = 3001

if (!process.env.GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY. Add it to the .env file in the project root.')
  process.exit(1)
}

// Turns Gemini errors into messages a user can understand.
function friendlyError(error: unknown): string {
  const status = (error as { status?: number })?.status

  if (status === 503) return 'The AI model is busy right now. Please try again in a minute.'
  if (status === 429) return 'Too many requests to the AI model. Please wait a bit and try again.'
  if (status === 400) return 'The AI model could not process this paper.'
  if (status === 401 || status === 403) return 'The Gemini API key was rejected. Check GEMINI_API_KEY in .env.'

  return error instanceof Error ? error.message : 'Extraction failed.'
}

const app = express()
app.use(express.json({ limit: '10mb' }))

app.post('/api/extract', async (req, res) => {
  const pages = req.body?.pages

  if (!Array.isArray(pages) || pages.length === 0) {
    res.status(400).json({ error: 'Request must include the paper pages.' })
    return
  }

  // Same paper (and prompt version) as before? Serve the saved graph for free.
  // ?fresh=1 skips the lookup and always calls the model.
  const key = cacheKey(pages)
  if (req.query.fresh !== '1') {
    const cached = await readCache(key)
    if (cached) {
      console.log(`[cache] hit ${key.slice(0, 12)} (${cached.model})`)
      res.json(cached.graph)
      return
    }
  }

  try {
    const { graph, model } = await extractGraph(pages)
    await writeCache(key, { graph, model, createdAt: new Date().toISOString() })
    res.json(graph)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: friendlyError(error) })
  }
})

// Finds reviews, the papers it builds on, and similar papers for the paper being read.
// Body: { title, firstPage, topic? } (RelatedRequest).
app.post('/api/related', async (req, res) => {
  const { title, firstPage, topic } = req.body ?? {}
  if (typeof title !== 'string' || typeof firstPage !== 'string') {
    res.status(400).json({ error: 'Request must include the paper title and first page.' })
    return
  }
  const request = { title, firstPage: firstPage.slice(0, 5000), topic: typeof topic === 'string' ? topic : undefined }

  const key = relatedCacheKey(request)
  const cached = await readRelatedCache(key)
  if (cached) {
    res.json(cached)
    return
  }

  try {
    const related = await findRelatedWork(request)
    console.log(
      `[related] ${related.match ? `matched by ${related.match.how}` : 'no match'} · ` +
        `${related.reviews.length} reviews, ${related.buildsOn.length} builds-on, ${related.similar.length} similar`,
    )
    await writeRelatedCache(key, related)
    res.json(related)
  } catch (error) {
    console.error(error)
    const busy = error instanceof RelatedBusyError
    res.status(busy ? 503 : 502).json({
      error: busy
        ? 'Semantic Scholar is busy right now. Try again in a minute.'
        : "Couldn't reach Semantic Scholar to look up related papers.",
    })
  }
})

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
