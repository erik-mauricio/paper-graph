import { useEffect, useState } from 'react'
import type { GraphEdge, GraphNode, PaperGraph, Relation, Section, Source } from '../types/graph'
import { COLOR_NAMES } from './highlightColors'
import { NODE_HEIGHT, NODE_WIDTH, initialPositions, type NodePosition, type Positions } from './layout'

type EditorState = {
  graph: PaperGraph
  positions: Positions
  sections: Section[]
  // True once the user has changed anything (cleared by "Reset to AI graph").
  edited: boolean
}

type Stored = EditorState & { version: 1 }

// The last delete, kept so it can be undone. Any other change clears it.
type Undo = { message: string; before: EditorState; at: number }

export type NodeInput = {
  type: GraphNode['type']
  text: string
  source?: Source
}

const SECTION_WIDTH = 360
const SECTION_HEIGHT = 260
// Space between a section's top edge and the first node inside it (room for the name).
const SECTION_HEADER = 44
const GAP = 16

function fromAi(graph: PaperGraph): EditorState {
  return { graph, positions: initialPositions(graph), sections: [], edited: false }
}

function load(key: string, aiGraph: PaperGraph): EditorState {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Stored>
      if (parsed.version === 1 && parsed.graph && parsed.positions && Array.isArray(parsed.sections)) {
        return {
          graph: parsed.graph,
          positions: parsed.positions,
          sections: parsed.sections,
          edited: Boolean(parsed.edited),
        }
      }
    }
  } catch {
    // Storage blocked or bad data: start from the AI graph.
  }
  return fromAi(aiGraph)
}

// Top-left corner of a node on the canvas, whether or not it's in a section.
function absolute(pos: NodePosition, sections: Section[]): { x: number; y: number } {
  const section = sections.find((s) => s.id === pos.sectionId)
  return section ? { x: pos.x + section.x, y: pos.y + section.y } : { x: pos.x, y: pos.y }
}

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`

// The user's edits to one paper's graph (nodes, links, sections, and where
// everything sits), saved in this browser. Starts from the AI graph.
export function useGraphEditor(key: string, aiGraph: PaperGraph) {
  const [state, setState] = useState<EditorState>(() => load(key, aiGraph))
  const [undo, setUndo] = useState<Undo | null>(null)

  useEffect(() => {
    try {
      if (state.edited) {
        const stored: Stored = { version: 1, ...state }
        localStorage.setItem(key, JSON.stringify(stored))
      } else {
        localStorage.removeItem(key)
      }
    } catch {
      // Storage blocked or full: edits still work for this visit.
    }
  }, [key, state])

  // Applies a change and marks the graph as edited. Clears any pending undo,
  // since undoing an older delete would also throw away this change.
  function change(update: (s: EditorState) => EditorState) {
    setState((s) => ({ ...update(s), edited: true }))
    setUndo(null)
  }

  // Like change(), but remembers the state before, so it can be undone.
  function changeWithUndo(message: string, update: (s: EditorState) => EditorState) {
    setUndo({ message, before: state, at: Date.now() })
    setState((s) => ({ ...update(s), edited: true }))
  }

  // ---- Nodes ----

  // Adds a node. `at` is a spot on the canvas (top-left corner), e.g. where the
  // user double-clicked or dropped a link. Without it, nodes go to a free slot
  // in their section, or stack in a column right of the AI's graph.
  function addNode(
    input: NodeInput,
    sectionId: string | null = null,
    at?: { x: number; y: number },
  ): GraphNode {
    const node: GraphNode = { id: newId('u'), origin: 'user', ...input }

    change((s) => {
      let position: NodePosition
      const section = s.sections.find((sec) => sec.id === sectionId)
      if (at) {
        position = section
          ? { x: Math.max(GAP, at.x - section.x), y: Math.max(SECTION_HEADER, at.y - section.y), sectionId: section.id }
          : { x: at.x, y: at.y, sectionId: null }
      } else if (section) {
        position = slotInSection(s, section)
      } else {
        const loose = Object.entries(s.positions).filter(([, p]) => !p.sectionId)
        const aiLoose = loose.filter(([id]) => s.graph.nodes.find((n) => n.id === id)?.origin !== 'user')
        const right = Math.max(0, ...aiLoose.map(([, p]) => p.x + NODE_WIDTH)) + 80
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
    })
    return node
  }

  function updateNode(id: string, patch: Partial<Pick<GraphNode, 'type' | 'text'>>) {
    change((s) => ({
      ...s,
      graph: {
        ...s.graph,
        nodes: s.graph.nodes.map((n) =>
          n.id === id ? { ...n, ...patch, edited: n.origin !== 'user' ? true : n.edited } : n,
        ),
      },
    }))
  }

  // Saves where a node was dragged to (and which section it landed in).
  function moveNode(id: string, position: NodePosition) {
    change((s) => ({
      ...s,
      positions: { ...s.positions, [id]: position },
      sections: position.sectionId ? growToFit(s.sections, position.sectionId, position) : s.sections,
    }))
  }

  // Puts a node in a section (or takes it out) from a menu rather than by dragging.
  function setNodeSection(id: string, sectionId: string | null) {
    change((s) => {
      const current = s.positions[id]
      if (!current || current.sectionId === sectionId) return s

      const section = s.sections.find((sec) => sec.id === sectionId)
      let position: NodePosition
      if (section) {
        position = slotInSection(s, section)
      } else {
        const abs = absolute(current, s.sections)
        position = { ...abs, sectionId: null }
      }
      return {
        ...s,
        positions: { ...s.positions, [id]: position },
        sections: section ? growToFit(s.sections, section.id, position) : s.sections,
      }
    })
  }

  // ---- Links ----

  function addEdge(from: string, to: string, relation: Relation) {
    const edge: GraphEdge = { id: newId('ul'), from, to, relation }
    change((s) => ({ ...s, graph: { ...s.graph, edges: [...s.graph.edges, edge] } }))
  }

  function updateEdge(id: string, relation: Relation) {
    change((s) => ({
      ...s,
      graph: { ...s.graph, edges: s.graph.edges.map((e) => (e.id === id ? { ...e, relation } : e)) },
    }))
  }

  // ---- Sections ----

  // Adds an empty section centered on a point (usually the middle of the view).
  function addSection(center: { x: number; y: number }): Section {
    const section: Section = {
      id: newId('s'),
      name: `Section ${state.sections.length + 1}`,
      color: COLOR_NAMES[state.sections.length % COLOR_NAMES.length],
      x: center.x - SECTION_WIDTH / 2,
      y: center.y - SECTION_HEIGHT / 2,
      width: SECTION_WIDTH,
      height: SECTION_HEIGHT,
    }
    change((s) => ({ ...s, sections: [...s.sections, section] }))
    return section
  }

  function updateSection(id: string, patch: Partial<Omit<Section, 'id'>>) {
    change((s) => ({
      ...s,
      sections: s.sections.map((sec) => (sec.id === id ? { ...sec, ...patch } : sec)),
    }))
  }

  // Resizing from the left or top edge moves the section's corner, so the
  // nodes inside are shifted back to stay where they were on screen.
  function resizeSection(id: string, box: { x: number; y: number; width: number; height: number }) {
    change((s) => {
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
      return {
        ...s,
        positions,
        sections: s.sections.map((sec) => (sec.id === id ? { ...sec, ...box } : sec)),
      }
    })
  }

  // ---- Deleting (undoable) ----

  // Deletes nodes (with their links), links, and sections in one undoable step.
  // Nodes in a deleted section stay on the canvas, just outside any section.
  function deleteItems({
    nodeIds = [],
    edgeIds = [],
    sectionIds = [],
  }: {
    nodeIds?: string[]
    edgeIds?: string[]
    sectionIds?: string[]
  }) {
    const nodes = new Set(nodeIds)
    const edges = new Set(edgeIds)
    const sections = new Set(sectionIds)
    if (!nodes.size && !edges.size && !sections.size) return

    const parts = [
      nodes.size && plural(nodes.size, 'node'),
      edges.size && plural(edges.size, 'link'),
      sections.size && plural(sections.size, 'section'),
    ].filter(Boolean)

    changeWithUndo(`Deleted ${parts.join(', ')}`, (s) => {
      const positions: Positions = {}
      for (const [id, p] of Object.entries(s.positions)) {
        if (nodes.has(id)) continue
        positions[id] =
          p.sectionId && sections.has(p.sectionId) ? { ...absolute(p, s.sections), sectionId: null } : p
      }
      return {
        ...s,
        graph: {
          ...s.graph,
          nodes: s.graph.nodes.filter((n) => !nodes.has(n.id)),
          edges: s.graph.edges.filter(
            (e) => !edges.has(e.id) && !nodes.has(e.from) && !nodes.has(e.to),
          ),
        },
        positions,
        sections: s.sections.filter((sec) => !sections.has(sec.id)),
      }
    })
  }

  function undoDelete() {
    if (!undo) return
    setState(undo.before)
    setUndo(null)
  }

  // ---- Whole graph ----

  // Re-runs the automatic layout for nodes that aren't in a section.
  function relayout() {
    change((s) => {
      const fresh = initialPositions(s.graph)
      const positions = { ...s.positions }
      for (const [id, p] of Object.entries(fresh)) {
        if (!positions[id]?.sectionId) positions[id] = p
      }
      return { ...s, positions }
    })
  }

  // Throws away every edit and goes back to what the AI made.
  function resetToAi() {
    setState(fromAi(aiGraph))
    setUndo(null)
  }

  return {
    graph: state.graph,
    positions: state.positions,
    sections: state.sections,
    edited: state.edited,
    undo,
    addNode,
    updateNode,
    moveNode,
    setNodeSection,
    addEdge,
    updateEdge,
    addSection,
    updateSection,
    resizeSection,
    deleteItems,
    undoDelete,
    dismissUndo: () => setUndo(null),
    relayout,
    resetToAi,
  }
}

export type GraphEditor = ReturnType<typeof useGraphEditor>

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
