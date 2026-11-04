export type NodeType = 'claim' | 'evidence'

export type Relation = 'supports' | 'contradicts'

export type Source = {
  page: number
  quote: string
  // Set after extraction: true if the quote was found in the paper's text.
  verified?: boolean
}

export type GraphNode = {
  id: string
  type: NodeType
  text: string
  source: Source
}

// Edges point from the supporting item to the thing it supports,
// e.g. evidence -> claim or claim -> claim.
export type GraphEdge = {
  id: string
  from: string
  to: string
  relation: Relation
}

export type PaperGraph = {
  title: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// The text of one PDF page.
export type PageText = {
  page: number
  text: string
}
