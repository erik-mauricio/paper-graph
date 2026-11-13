import { GoogleGenAI } from '@google/genai'
import type { PageText, PaperGraph } from '../src/types/graph.ts'
import { graphSchema, removeBrokenEdges } from './graphSchema.ts'
import { buildPrompt } from './prompt.ts'
import { trimPaper } from './trimPaper.ts'

// Free-tier models to try, in order. If one is busy, the next one is used.
// Set GEMINI_MODEL in .env to try a specific model first.
const MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
].filter((model): model is string => Boolean(model))

// Each model gets this many tries (1 + retries) before moving to the next one.
const ATTEMPTS_PER_MODEL = 3
const BACKOFF_MS = [1000, 3000]
const MAX_WAIT_MS = 10_000

// Dev-only: SIMULATE_BUSY=1 makes every Gemini call fail as "busy" to test the fallbacks.
const SIMULATE_BUSY = process.env.SIMULATE_BUSY === '1'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

export type ExtractResult = {
  graph: PaperGraph
  model: string
}

// Busy (503) or rate-limited (429) errors are worth retrying.
function isBusyError(error: unknown): boolean {
  const status = (error as { status?: number })?.status
  return status === 503 || status === 429
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// How long to wait before retry number `attempt` (0-based). A 429 from Gemini
// may say how long to wait ("retryDelay": "12s"); otherwise back off with jitter.
function retryWait(error: unknown, attempt: number): number {
  const message = error instanceof Error ? error.message : ''
  const suggested = message.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/)
  if (suggested) return Math.min(Number(suggested[1]) * 1000, MAX_WAIT_MS)

  const base = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]
  return base + Math.random() * 500
}

async function callGemini(model: string, prompt: string) {
  if (SIMULATE_BUSY) {
    throw Object.assign(new Error('Simulated busy model'), { status: 503 })
  }

  return ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: graphSchema,
    },
  })
}

// Tries each Gemini model in turn, retrying busy ones with backoff.
async function generateWithFallback(prompt: string, pageCount: number): Promise<ExtractResult> {
  let lastError: unknown

  for (const model of MODELS) {
    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const response = await callGemini(model, prompt)
        const usage = response.usageMetadata
        console.log(
          `[gemini] ${model} · ${pageCount} pages · tokens: prompt ${usage?.promptTokenCount ?? '?'}, ` +
            `output ${usage?.candidatesTokenCount ?? '?'}, thinking ${usage?.thoughtsTokenCount ?? 0}, ` +
            `total ${usage?.totalTokenCount ?? '?'}`,
        )

        if (!response.text) throw new Error('Gemini returned an empty response.')
        return { graph: JSON.parse(response.text), model }
      } catch (error) {
        if (!isBusyError(error)) throw error
        lastError = error

        if (attempt < ATTEMPTS_PER_MODEL - 1) {
          const wait = retryWait(error, attempt)
          console.warn(`[gemini] ${model} is busy (try ${attempt + 1}), retrying in ${(wait / 1000).toFixed(1)}s...`)
          await sleep(wait)
        } else {
          console.warn(`[gemini] ${model} is still busy, moving on.`)
        }
      }
    }
  }

  throw lastError
}

// Asks Gemini to turn the paper's text into a claims-and-evidence graph.
export async function extractGraph(pages: PageText[]): Promise<ExtractResult> {
  const trimmed = trimPaper(pages)
  const saved = 1 - trimmed.charsAfter / Math.max(trimmed.charsBefore, 1)
  console.log(
    `[trim] ${trimmed.charsBefore} → ${trimmed.charsAfter} chars (-${Math.round(saved * 100)}%) · ` +
      (trimmed.referencesPage
        ? `references cut from page ${trimmed.referencesPage}`
        : 'no references heading found'),
  )

  const result = await generateWithFallback(buildPrompt(trimmed.pages), pages.length)
  return { ...result, graph: removeBrokenEdges(result.graph) }
}
