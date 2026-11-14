// Checks each node's quote against the paper's text and marks it verified or not
// (and fixes the page number if the quote is on another page).
import type { Fact, GraphNode, PageText, PaperContext, PaperGraph, Source } from '@shared/graph'

// Makes text comparable: lowercase, straight quotes, no hyphens or dashes,
// single spaces. Hyphens are dropped because a word like "text-based" that wraps
// at a line end is rejoined as "textbased" when the PDF is read (matches findQuote).
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[­‐-―-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Checks one quote. If it's on a different page than stated, fixes the page.
function verifySource(source: Source, pages: PageText[]): Source {
  const quote = normalize(source.quote)
  const statedPage = pages.find((p) => p.page === source.page)

  if (statedPage && normalize(statedPage.text).includes(quote)) {
    return { ...source, verified: true }
  }

  const actualPage = pages.find((p) => normalize(p.text).includes(quote))
  if (actualPage) {
    return { ...source, page: actualPage.page, verified: true }
  }

  return { ...source, verified: false }
}

function verifyNode(node: GraphNode, pages: PageText[]): GraphNode {
  // The user's own notes have nothing to check.
  if (!node.source) return node
  return { ...node, source: verifySource(node.source, pages) }
}

function verifyFacts(facts: Fact[], pages: PageText[]): Fact[] {
  return facts.map((fact) => ({ ...fact, source: verifySource(fact.source, pages) }))
}

function verifyContext(context: PaperContext, pages: PageText[]): PaperContext {
  const { study } = context
  return {
    ...context,
    background: verifyFacts(context.background, pages),
    study: {
      ...study,
      question: { ...study.question, source: verifySource(study.question.source, pages) },
      design: verifyFacts(study.design, pages),
      participants: verifyFacts(study.participants, pages),
      groups: study.groups.map((g) => ({ ...g, source: verifySource(g.source, pages) })),
      measures: verifyFacts(study.measures, pages),
    },
  }
}

// Marks each quote (in the nodes and the overview) as verified or not by
// searching the paper's text.
export function verifyQuotes(graph: PaperGraph, pages: PageText[]): PaperGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => verifyNode(node, pages)),
    ...(graph.context && { context: verifyContext(graph.context, pages) }),
  }
}
