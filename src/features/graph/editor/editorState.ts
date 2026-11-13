// The rules for editing a paper's graph, as pure functions: (state, args) → new state.
// useGraphEditor.ts wires these to React state, localStorage, and undo.
// Keeping them pure means they can be unit-tested (editorState.test.ts).
import type { GraphEdge, GraphNode, PaperGraph, Relation, Section, Source } from '@shared/graph'
import { NODE_HEIGHT, NODE_WIDTH, initialPositions, type NodePosition, type Positions } from '@/features/graph/model/layout'
import { COLOR_NAMES } from '@/features/pdf/highlightColors'

export type EditorState = {
  graph: PaperGraph
  positions: Positions
  sections: Section[]
  // True once the user has changed anything (cleared by "Reset to AI graph").
  edited: boolean
}

// What's saved in localStorage. Version 2: the graph is laid out claim-first.
// Version 1 saves were laid out evidence-first and get mirrored when loaded.
export type StoredEditorState = EditorState & { version: 2 }

export type NodeInput = {
  type: GraphNode['type']
  text: string
  source?: Source
}

export type DeleteRequest = {
  nodeIds?: string[]
  edgeIds?: string[]
  sectionIds?: string[]
}

type Point = { x: number; y: number }
type Box = Point & { width: number; height: number }

const SECTION_WIDTH = 360
const SECTION_HEIGHT = 260
// Space between a section's top edge and the first node inside it (room for the name).
const SECTION_HEADER = 44
const GAP = 16
// Gap between the AI's graph and the column where new nodes stack up.
const NEW_NODE_COLUMN_GAP = 80

// ---- Loading and saving ----

export function fromAi(graph: PaperGraph): EditorState {
  return { graph, positions: initialPositions(graph), sections: [], edited: false }
}

// Reads a saved state (the raw localStorage string). Falls back to the AI graph
// when there's nothing saved or the data is unusable.
export function parseSaved(raw: string | null, aiGraph: PaperGraph): EditorState {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<EditorState> & { version?: number }
      if (
        (parsed.version === 1 || parsed.version === 2) &&
        parsed.graph &&
        parsed.positions &&
        Array.isArray(parsed.sections)
      ) {
        const saved: EditorState = {
          graph: parsed.graph,
          positions: parsed.positions,
          sections: parsed.sections,
          edited: Boolean(parsed.edited),
        }
        return parsed.version === 1 ? mirror(saved) : saved
      }
    } catch {
      // Bad data: start from the AI graph.
    }
  }
  return fromAi(aiGraph)
}

export function toStored(s: EditorState): StoredEditorState {
  return { version: 2, ...s }
}

// Flips a layout left-to-right, keeping the user's arrangement and sections.
// Used for saves from before the graph was laid out claim-first.
export function mirror(s: EditorState): EditorState {
  const sections = s.sections.map((sec) => ({ ...sec, x: -(sec.x + sec.width) }))
  const positions: Positions = {}
  for (const [id, p] of Object.entries(s.positions)) {
    const section = s.sections.find((sec) => sec.id === p.sectionId)
    positions[id] = {
      ...p,
      x: section ? section.width - (p.x + NODE_WIDTH) : -(p.x + NODE_WIDTH),
    }
  }
  return { ...s, positions, sections }
}

// ---- Nodes ----

// Adds a node. `at` is a spot on the canvas (top-left corner), e.g. where the
// user double-clicked or dropped a link. Without it, the node goes to a free
// slot in its section, or stacks in a column right of the AI's graph.
export function addNode(s: EditorState, node: GraphNode, sectionId: string | null = null, at?: Point): EditorState {
  const section = s.sections.find((sec) => sec.id === sectionId)
  let position: NodePosition
  if (at) {
    position = section
      ? { x: Math.max(GAP, at.x - section.x), y: Math.max(SECTION_HEADER, at.y - section.y), sectionId: section.id }
      : { x: at.x, y: at.y, sectionId: null }
  } else if (section) {
    position = slotInSection(s, section)
  } else {
    const loose = Object.entries(s.positions).filter(([, p]) => !p.sectionId)
    const aiLoose = loose.filter(([id]) => s.graph.nodes.find((n) => n.id === id)?.origin !== 'user')
    const right = Math.max(0, ...aiLoose.map(([, p]) => p.x + NODE_WIDTH)) + NEW_NODE_COLUMN_GAP
    const top = Math.min(...loose.map(([, p]) => p.y), 0)
    const inColumn = loose.filter(([, p]) => p.x === right).length
    position = { x: right, y: top + inColumn * (NODE_HEIGHT + GAP), sectionId: null }
  }

  return {
    ...s,
    graph: { ...s.graph, nodes: [...s.graph.nodes, node] },
    positions: { ...s.positions, [node.id]: position },
    sections: section ? growToFit(s.sections, section.id, position) : s.sections,
  }
}

// Changes a node's type or text. AI-made nodes get marked as edited.
export function updateNode(s: EditorState, id: string, patch: Partial<Pick<GraphNode, 'type' | 'text'>>): EditorState {
  return {
    ...s,
    graph: {
      ...s.graph,
      nodes: s.graph.nodes.map((n) =>
        n.id === id ? { ...n, ...patch, edited: n.origin !== 'user' ? true : n.edited } : n,
      ),
    },
  }
}

// Saves where a node was dragged to (and which section it landed in).
export function moveNode(s: EditorState, id: string, position: NodePosition): EditorState {
  return {
    ...s,
    positions: { ...s.positions, [id]: position },
    sections: position.sectionId ? growToFit(s.sections, position.sectionId, position) : s.sections,
  }
}

// Puts a node in a section (or takes it out) from a menu rather than by dragging.
export function setNodeSection(s: EditorState, id: string, sectionId: string | null): EditorState {
  const current = s.positions[id]
  if (!current || current.sectionId === sectionId) return s

  const section = s.sections.find((sec) => sec.id === sectionId)
  const position: NodePosition = section
    ? slotInSection(s, section)
    : { ...absolutePosition(current, s.sections), sectionId: null }
  return {
    ...s,
    positions: { ...s.positions, [id]: position },
    sections: section ? growToFit(s.sections, section.id, position) : s.sections,
  }
}

// ---- Links (stored supporter → supported) ----

export function addEdge(s: EditorState, edge: GraphEdge): EditorState {
  return { ...s, graph: { ...s.graph, edges: [...s.graph.edges, edge] } }
}

export function updateEdge(s: EditorState, id: string, relation: Relation): EditorState {
  return {
    ...s,
    graph: { ...s.graph, edges: s.graph.edges.map((e) => (e.id === id ? { ...e, relation } : e)) },
  }
}

// ---- Sections ----

// A new, empty section centered on a point, with the next name and color.
export function makeSection(s: EditorState, id: string, center: Point): Section {
  return {
    id,
    name: `Section ${s.sections.length + 1}`,
    color: COLOR_NAMES[s.sections.length % COLOR_NAMES.length],
    x: center.x - SECTION_WIDTH / 2,
    y: center.y - SECTION_HEIGHT / 2,
    width: SECTION_WIDTH,
    height: SECTION_HEIGHT,
  }
}

export function addSection(s: EditorState, section: Section): EditorState {
  return { ...s, sections: [...s.sections, section] }
}

export function updateSection(s: EditorState, id: string, patch: Partial<Omit<Section, 'id'>>): EditorState {
  return { ...s, sections: s.sections.map((sec) => (sec.id === id ? { ...sec, ...patch } : sec)) }
}

// Resizing from the left or top edge moves the section's corner, so the
// nodes inside are shifted back to stay where they were on screen.
export function resizeSection(s: EditorState, id: string, box: Box): EditorState {
  const old = s.sections.find((sec) => sec.id === id)
  if (!old) return s
  const dx = box.x - old.x
  const dy = box.y - old.y
  const positions = { ...s.positions }
  if (dx || dy) {
    for (const [nodeId, p] of Object.entries(positions)) {
      if (p.sectionId === id) positions[nodeId] = { ...p, x: p.x - dx, y: p.y - dy }
    }
  }
  return { ...s, positions, sections: s.sections.map((sec) => (sec.id === id ? { ...sec, ...box } : sec)) }
}

// ---- Deleting ----

// Deletes nodes (with their links), links, and sections. Nodes in a deleted
// section stay on the canvas, just outside any section.
export function deleteItems(s: EditorState, { nodeIds = [], edgeIds = [], sectionIds = [] }: DeleteRequest): EditorState {
  const nodes = new Set(nodeIds)
  const edges = new Set(edgeIds)
  const sections = new Set(sectionIds)

  const positions: Positions = {}
  for (const [id, p] of Object.entries(s.positions)) {
    if (nodes.has(id)) continue
    positions[id] = p.sectionId && sections.has(p.sectionId) ? { ...absolutePosition(p, s.sections), sectionId: null } : p
  }
  return {
    ...s,
    graph: {
      ...s.graph,
      nodes: s.graph.nodes.filter((n) => !nodes.has(n.id)),
      edges: s.graph.edges.filter((e) => !edges.has(e.id) && !nodes.has(e.from) && !nodes.has(e.to)),
    },
    positions,
    sections: s.sections.filter((sec) => !sections.has(sec.id)),
  }
}

// "Deleted 1 node, 2 links" for the undo toast, or null if nothing was picked.
export function deleteMessage({ nodeIds = [], edgeIds = [], sectionIds = [] }: DeleteRequest): string | null {
  const parts = [
    nodeIds.length && plural(nodeIds.length, 'node'),
    edgeIds.length && plural(edgeIds.length, 'link'),
    sectionIds.length && plural(sectionIds.length, 'section'),
  ].filter(Boolean)
  return parts.length ? `Deleted ${parts.join(', ')}` : null
}

// ---- Whole graph ----

// Re-runs the automatic layout for nodes that aren't in a section.
export function relayout(s: EditorState): EditorState {
  const fresh = initialPositions(s.graph)
  const positions = { ...s.positions }
  for (const [id, p] of Object.entries(fresh)) {
    if (!positions[id]?.sectionId) positions[id] = p
  }
  return { ...s, positions }
}

// ---- Helpers ----

// Top-left corner of a node on the canvas, whether or not it's in a section.
export function absolutePosition(pos: NodePosition, sections: Section[]): Point {
  const section = sections.find((sec) => sec.id === pos.sectionId)
  return section ? { x: pos.x + section.x, y: pos.y + section.y } : { x: pos.x, y: pos.y }
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

// A free spot inside a section: below the nodes already in it.
function slotInSection(s: EditorState, section: Section): NodePosition {
  const inside = Object.values(s.positions).filter((p) => p.sectionId === section.id)
  const bottom = Math.max(SECTION_HEADER - GAP, ...inside.map((p) => p.y + NODE_HEIGHT))
  return { x: GAP, y: bottom + GAP, sectionId: section.id }
}

// Makes a section big enough to hold a node at the given (relative) position.
function growToFit(sections: Section[], id: string, pos: NodePosition): Section[] {
  return sections.map((sec) =>
    sec.id === id
      ? {
          ...sec,
          width: Math.max(sec.width, pos.x + NODE_WIDTH + GAP),
          height: Math.max(sec.height, pos.y + NODE_HEIGHT + GAP),
        }
      : sec,
  )
}
