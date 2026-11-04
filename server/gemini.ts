import { GoogleGenAI } from '@google/genai'
import type { PageText, PaperGraph } from '../src/types/graph.ts'
import { buildPrompt } from './prompt.ts'

// Free-tier models to try, in order. If one is busy, the next one is used.
// Set GEMINI_MODEL in .env to try a specific model first.
const MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
].filter((model): model is string => Boolean(model))

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

// JSON schema matching the PaperGraph type, so Gemini returns that exact shape.
const graphSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['claim', 'evidence'] },
          text: { type: 'string' },
          source: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              quote: { type: 'string' },
            },
            required: ['page', 'quote'],
          },
        },
        required: ['id', 'type', 'text', 'source'],
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
          relation: { type: 'string', enum: ['supports', 'contradicts'] },
        },
        required: ['id', 'from', 'to', 'relation'],
      },
    },
  },
  required: ['title', 'nodes', 'edges'],
}

// Drops links that point to ids that don't exist.
function removeBrokenEdges(graph: PaperGraph): PaperGraph {
  const ids = new Set(graph.nodes.map((node) => node.id))
  return {
    ...graph,
    edges: graph.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)),
  }
}

// Busy (503) or rate-limited (429) errors are worth retrying with another model.
function isBusyError(error: unknown): boolean {
  const status = (error as { status?: number })?.status
  return status === 503 || status === 429
}

// Calls Gemini, moving on to the next model in MODELS if one is busy.
async function generateWithFallback(prompt: string) {
  let lastError: unknown

  for (const model of MODELS) {
    try {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: graphSchema,
        },
      })
    } catch (error) {
      if (!isBusyError(error)) throw error
      console.warn(`${model} is busy, trying the next model...`)
      lastError = error
    }
  }

  throw lastError
}

// Asks Gemini to turn the paper's text into a claims-and-evidence graph.
export async function extractGraph(pages: PageText[]): Promise<PaperGraph> {
  const response = await generateWithFallback(buildPrompt(pages))

  if (!response.text) {
    throw new Error('Gemini returned an empty response.')
  }

  const graph: PaperGraph = JSON.parse(response.text)
  return removeBrokenEdges(graph)
}
