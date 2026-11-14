// The graph data types, shared by the server (what Gemini returns) and the app.
// Links are stored supporter → supported (evidence → claim).
import type { HighlightColor } from './colors.ts'

// 'method' nodes describe how the study was done (its design, its control and
// treatment groups, what it measured) and link to the results they produced.
// 'note' nodes are only ever made by the user.
export type NodeType = 'claim' | 'evidence' | 'method' | 'note'

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
  // The paper's overview, background and study design. Missing in graphs made
  // before this was extracted (old cache entries and saved edits).
  context?: PaperContext
}

// One point about the paper, in plain words, with the passage it comes from.
export type Fact = {
  text: string
  source: Source
}

export type StudyKind =
  | 'experiment'
  | 'observational'
  | 'computational'
  | 'review'
  | 'theoretical'
  | 'other'

// A group or condition the study compares. Only experiments and comparisons have these.
export type StudyGroup = {
  name: string
  role: 'control' | 'treatment' | 'comparison'
  // Exactly what this group got or did.
  description: string
  source: Source
}

// What the study is and how it was done. Lists are empty when they don't
// apply (a theory paper has no control group).
export type StudyDesign = {
  kind: StudyKind
  question: Fact
  design: Fact[]
  // Who or what was studied: participants, sample size, datasets.
  participants: Fact[]
  groups: StudyGroup[]
  // What was measured or compared to judge the outcome.
  measures: Fact[]
}

export type PaperContext = {
  // Two or three plain-language sentences on what the paper does and finds.
  summary: string
  // The problem and why it matters, from the paper's own introduction.
  background: Fact[]
  study: StudyDesign
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
