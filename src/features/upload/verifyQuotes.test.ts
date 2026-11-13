import { describe, expect, it } from 'vitest'
import type { PaperGraph } from '@shared/graph'
import { verifyQuotes } from './verifyQuotes'

// Page text as it arrives here: already cleaned by cleanPages, so "text-\nbased"
// has been joined into "textbased".
const pages = [
  { page: 1, text: 'We present a system that converts textbased\nresponses into diagrams.' },
  { page: 2, text: 'It reaches an Fscore of 97.24% after one round.' },
]

function graphWith(quote: string, page: number): PaperGraph {
  return { title: 't', edges: [], nodes: [{ id: 'n', type: 'claim', text: 't', source: { page, quote } }] }
}

describe('verifyQuotes', () => {
  it('ignores hyphens, dashes, and line breaks when matching', () => {
    const result = verifyQuotes(graphWith('converts text-based responses into diagrams', 1), pages)
    expect(result.nodes[0].source?.verified).toBe(true)
  })

  it('matches "F-score" against text where the PDF joined it as "Fscore"', () => {
    const result = verifyQuotes(graphWith('an F-score of 97.24%', 2), pages)
    expect(result.nodes[0].source?.verified).toBe(true)
  })

  it('fixes the page number when the quote is on another page', () => {
    const result = verifyQuotes(graphWith('an Fscore of 97.24%', 1), pages)
    expect(result.nodes[0].source).toMatchObject({ page: 2, verified: true })
  })

  it('flags quotes that are not in the paper', () => {
    const result = verifyQuotes(graphWith('a sentence the paper never says', 1), pages)
    expect(result.nodes[0].source?.verified).toBe(false)
  })

  it('leaves notes without a source alone', () => {
    const graph: PaperGraph = { title: 't', edges: [], nodes: [{ id: 'u', type: 'note', text: 'my note' }] }
    expect(verifyQuotes(graph, pages).nodes[0]).toEqual(graph.nodes[0])
  })
})
