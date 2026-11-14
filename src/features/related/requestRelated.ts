// Asks our server (POST /api/related) for related work on the paper.
import type { RelatedRequest, RelatedWork } from '@shared/related'

export async function requestRelated(request: RelatedRequest): Promise<RelatedWork> {
  const response = await fetch('/api/related', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error ?? `Couldn't load related papers (${response.status}).`)
  }

  return response.json()
}
