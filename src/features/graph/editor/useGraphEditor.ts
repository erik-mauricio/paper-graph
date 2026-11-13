// The user's edits to one paper's graph (nodes, links, sections, and where
// everything sits), saved in this browser. Starts from the AI graph.
// The editing rules live in editorState.ts; this hook adds React state,
// localStorage, ids, and undo for deletes. Created in pages/ResultsPage.tsx.
import { useEffect, useState } from 'react'
import type { GraphEdge, GraphNode, PaperGraph, Relation, Section } from '@shared/graph'
import type { NodePosition } from '@/features/graph/model/layout'
import * as edit from './editorState'
import type { DeleteRequest, EditorState, NodeInput } from './editorState'

export type { NodeInput } from './editorState'

// The last delete, kept so it can be undone. Any other change clears it.
type Undo = { message: string; before: EditorState; at: number }

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`

function load(key: string, aiGraph: PaperGraph): EditorState {
  try {
    return edit.parseSaved(localStorage.getItem(key), aiGraph)
  } catch {
    // Storage blocked: start from the AI graph.
    return edit.fromAi(aiGraph)
  }
}

export function useGraphEditor(key: string, aiGraph: PaperGraph) {
  const [state, setState] = useState<EditorState>(() => load(key, aiGraph))
  const [undo, setUndo] = useState<Undo | null>(null)

  useEffect(() => {
    try {
      if (state.edited) localStorage.setItem(key, JSON.stringify(edit.toStored(state)))
      else localStorage.removeItem(key)
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

  // Adds a node; see editorState.addNode for where it's placed.
  function addNode(input: NodeInput, sectionId: string | null = null, at?: { x: number; y: number }): GraphNode {
    const node: GraphNode = { id: newId('u'), origin: 'user', ...input }
    change((s) => edit.addNode(s, node, sectionId, at))
    return node
  }

  function addEdge(from: string, to: string, relation: Relation) {
    const edge: GraphEdge = { id: newId('ul'), from, to, relation }
    change((s) => edit.addEdge(s, edge))
  }

  function addSection(center: { x: number; y: number }): Section {
    const section = edit.makeSection(state, newId('s'), center)
    change((s) => edit.addSection(s, section))
    return section
  }

  // Deletes in one undoable step and shows the undo toast.
  function deleteItems(request: DeleteRequest) {
    const message = edit.deleteMessage(request)
    if (!message) return
    setUndo({ message, before: state, at: Date.now() })
    setState((s) => ({ ...edit.deleteItems(s, request), edited: true }))
  }

  function undoDelete() {
    if (!undo) return
    setState(undo.before)
    setUndo(null)
  }

  // Throws away every edit and goes back to what the AI made.
  function resetToAi() {
    setState(edit.fromAi(aiGraph))
    setUndo(null)
  }

  return {
    graph: state.graph,
    positions: state.positions,
    sections: state.sections,
    edited: state.edited,
    undo,
    addNode,
    updateNode: (id: string, patch: Partial<Pick<GraphNode, 'type' | 'text'>>) =>
      change((s) => edit.updateNode(s, id, patch)),
    moveNode: (id: string, position: NodePosition) => change((s) => edit.moveNode(s, id, position)),
    setNodeSection: (id: string, sectionId: string | null) => change((s) => edit.setNodeSection(s, id, sectionId)),
    addEdge,
    updateEdge: (id: string, relation: Relation) => change((s) => edit.updateEdge(s, id, relation)),
    addSection,
    updateSection: (id: string, patch: Partial<Omit<Section, 'id'>>) =>
      change((s) => edit.updateSection(s, id, patch)),
    resizeSection: (id: string, box: { x: number; y: number; width: number; height: number }) =>
      change((s) => edit.resizeSection(s, id, box)),
    deleteItems,
    undoDelete,
    dismissUndo: () => setUndo(null),
    relayout: () => change(edit.relayout),
    resetToAi,
  }
}

export type GraphEditor = ReturnType<typeof useGraphEditor>
