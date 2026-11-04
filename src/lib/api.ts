import type { PageText, PaperGraph } from '../types/graph'

// Sends the paper's text to our server, which asks Gemini for the graph.
export async function requestGraph(pages: PageText[]): Promise<PaperGraph> {
  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pages }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Server error (${response.status}).`)
  }

  return response.json()
}
