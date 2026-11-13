import type { PageText, PaperGraph } from '../types/graph'

// Sends the paper's text to our server, which asks Gemini for the graph.
export async function requestGraph(pages: PageText[]): Promise<PaperGraph> {
  // Dev: open the app with ?fresh to skip the server's cache and call the model again.
  const fresh = new URLSearchParams(window.location.search).has('fresh')
  const response = await fetch(`/api/extract${fresh ? '?fresh=1' : ''}`, {
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
