// The graph data types, shared by the server (what Gemini returns) and the app.
// Links are stored supporter → supported (evidence → claim).
import type { HighlightColor } from './colors.ts'

// 'note' nodes are only ever made by the user.
export type NodeType = 'claim' | 'evidence' | 'note'

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
  // Where in the paper this came from. Missing for the user's free-text notes.
  source?: Source
  // Who made the node. Missing means the AI.
  origin?: 'ai' | 'user'
  // True once the user has changed an AI-made node.
  edited?: boolean
}

// Edges are stored from the supporting item to the thing it supports
// (the graph draws them the other way: claim → backed by → evidence),
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

// A labeled box the user draws on the graph to group nodes.
export type Section = {
  id: string
  name: string
  color: HighlightColor
  x: number
  y: number
  width: number
  height: number
}
