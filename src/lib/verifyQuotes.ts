import type { GraphNode, PageText, PaperGraph } from '../types/graph'

// Makes text comparable: lowercase, straight quotes, single spaces.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

// Checks one node's quote. If it's on a different page than stated, fixes the page.
function verifyNode(node: GraphNode, pages: PageText[]): GraphNode {
  const quote = normalize(node.source.quote)
  const statedPage = pages.find((p) => p.page === node.source.page)

  if (statedPage && normalize(statedPage.text).includes(quote)) {
    return { ...node, source: { ...node.source, verified: true } }
  }

  const actualPage = pages.find((p) => normalize(p.text).includes(quote))
  if (actualPage) {
    return {
      ...node,
      source: { ...node.source, page: actualPage.page, verified: true },
    }
  }

  return { ...node, source: { ...node.source, verified: false } }
}

// Marks each quote as verified or not by searching the paper's text.
export function verifyQuotes(graph: PaperGraph, pages: PageText[]): PaperGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => verifyNode(node, pages)),
  }
}
