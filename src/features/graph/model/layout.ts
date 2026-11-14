// Turns a graph into what React Flow draws: claim-first automatic layout (dagre),
// nodes with section parents, and links drawn claim → evidence.
import { Graph, layout } from '@dagrejs/dagre'
import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { GraphEdge, GraphNode, PaperGraph, Relation, Section } from '@shared/graph'
import { getClaimLabels } from './graphQueries'

export const NODE_WIDTH = 260
export const NODE_HEIGHT = 112

// claimLabel is the claim's number ("1a"), from getClaimLabels.
export type ArgumentNodeData = { node: GraphNode; sectionName?: string; claimLabel?: string }
export type ArgumentFlowNode = Node<ArgumentNodeData, 'argument'>

export type SectionNodeData = { section: Section }
export type SectionFlowNode = Node<SectionNodeData, 'section'>

export type FlowNode = ArgumentFlowNode | SectionFlowNode

// Where a node sits. Inside a section, x and y are relative to the section's corner.
export type NodePosition = { x: number; y: number; sectionId: string | null }
export type Positions = Record<string, NodePosition>

// Gap between the argument and the methods column to its right.
export const METHODS_COLUMN_GAP = 140

// Lays nodes out left to right with dagre, claim-first: claims on the left and
// what backs them up to the right. Methods go in their own column at the far
// right, so the study design reads as one block (see placeMethods).
// Returns top-left corners, none in a section.
export function initialPositions(graph: PaperGraph): Positions {
  const isMethod = new Set(graph.nodes.filter((n) => n.type === 'method').map((n) => n.id))
  const argumentNodes = graph.nodes.filter((n) => !isMethod.has(n.id))
  const argumentEdges = graph.edges.filter((e) => !isMethod.has(e.from) && !isMethod.has(e.to))

  const g = new Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 24, ranksep: 90, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of argumentNodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const edge of argumentEdges) {
    // Links are stored supporter → supported; laying them out the other way
    // round puts the supported claim first.
    g.setEdge(edge.to, edge.from)
  }

  layout(g)

  const positions: Positions = {}
  for (const node of argumentNodes) {
    const { x, y } = g.node(node.id)
    // dagre gives the center; React Flow wants the top-left corner.
    positions[node.id] = { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2, sectionId: null }
  }

  // dagre puts unlinked nodes in the first column, which is the claims column.
  // Move unlinked evidence and notes to the evidence column, below everything.
  const linked = new Set(argumentEdges.flatMap((e) => [e.from, e.to]))
  const loose = argumentNodes.filter((n) => n.type !== 'claim' && !linked.has(n.id))
  const backers = argumentEdges.map((e) => positions[e.from]).filter(Boolean)
  if (loose.length && backers.length) {
    const column = Math.min(...backers.map((p) => p.x))
    let y = Math.max(...Object.values(positions).map((p) => p.y)) + NODE_HEIGHT + 48
    for (const n of loose) {
      positions[n.id] = { x: column, y, sectionId: null }
      y += NODE_HEIGHT + 24
    }
  }

  return { ...positions, ...placeMethods(graph, positions) }
}

// Stacks method nodes in one column right of everything else. Each method is
// placed level with the results it produced (by their average height), so the
// links between them run as straight as possible; unlinked methods go last.
function placeMethods(graph: PaperGraph, positions: Positions): Positions {
  const methods = graph.nodes.filter((n) => n.type === 'method')
  if (!methods.length) return {}

  const placed = Object.values(positions)
  const x = placed.length ? Math.max(...placed.map((p) => p.x)) + NODE_WIDTH + METHODS_COLUMN_GAP : 0
  const top = placed.length ? Math.min(...placed.map((p) => p.y)) : 0

  const targetY = (id: string) => {
    const ys = graph.edges
      .flatMap((e) => (e.from === id ? [e.to] : e.to === id ? [e.from] : []))
      .map((other) => positions[other]?.y)
      .filter((y): y is number => y !== undefined)
    return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : Infinity
  }
  const ordered = methods
    .map((n, i) => ({ id: n.id, y: targetY(n.id), i }))
    .sort((a, b) => a.y - b.y || a.i - b.i)

  // Keep each method near its results, but never overlapping the one above.
  const result: Positions = {}
  let nextFree = top
  for (const { id, y } of ordered) {
    const at = Math.max(nextFree, Number.isFinite(y) ? y : nextFree)
    result[id] = { x, y: at, sectionId: null }
    nextFree = at + NODE_HEIGHT + 24
  }
  return result
}

// Builds React Flow nodes. Sections come first because React Flow needs a
// parent before its children.
export function toFlowNodes(
  graph: PaperGraph,
  positions: Positions,
  sections: Section[],
): FlowNode[] {
  const sectionIds = new Set(sections.map((s) => s.id))
  const claimLabels = getClaimLabels(graph)

  const sectionNodes: SectionFlowNode[] = sections.map((section) => ({
    id: section.id,
    type: 'section',
    position: { x: section.x, y: section.y },
    width: section.width,
    height: section.height,
    data: { section },
    // Always behind the nodes, including ones that aren't in this section.
    zIndex: -1,
  }))

  const argumentNodes: ArgumentFlowNode[] = graph.nodes.map((node) => {
    const pos = positions[node.id] ?? { x: 0, y: 0, sectionId: null }
    const parentId = pos.sectionId && sectionIds.has(pos.sectionId) ? pos.sectionId : undefined
    return {
      id: node.id,
      type: 'argument',
      position: { x: pos.x, y: pos.y },
      parentId,
      data: { node, claimLabel: claimLabels.get(node.id) },
    }
  })

  return [...sectionNodes, ...argumentNodes]
}

export type ArgumentEdgeData = { relation: Relation }
export type ArgumentFlowEdge = Edge<ArgumentEdgeData, 'argument'>

export function toFlowEdge(edge: GraphEdge): ArgumentFlowEdge {
  const contradicts = edge.relation === 'contradicts'
  const color = contradicts ? 'var(--color-error)' : 'var(--color-primary)'
  return {
    id: edge.id,
    type: 'argument',
    // Drawn claim → evidence ("backed by"), the reverse of how links are stored.
    source: edge.to,
    target: edge.from,
    data: { relation: edge.relation },
    className: contradicts ? 'edge-contradicts' : 'edge-supports',
    style: {
      stroke: color,
      strokeWidth: 2,
      strokeDasharray: contradicts ? '6 4' : undefined,
    },
    markerEnd: { type: MarkerType.ArrowClosed, color },
  }
}
