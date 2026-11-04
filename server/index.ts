import express from 'express'
import { extractGraph } from './gemini.ts'

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

  try {
    const graph = await extractGraph(pages)
    res.json(graph)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: friendlyError(error) })
  }
})

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
