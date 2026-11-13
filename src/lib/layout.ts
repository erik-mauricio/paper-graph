import { Graph, layout } from '@dagrejs/dagre'
import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { GraphEdge, GraphNode, PaperGraph, Relation, Section } from '../types/graph'

export const NODE_WIDTH = 260
export const NODE_HEIGHT = 112

export type ArgumentNodeData = { node: GraphNode; sectionName?: string }
export type ArgumentFlowNode = Node<ArgumentNodeData, 'argument'>

export type SectionNodeData = { section: Section }
export type SectionFlowNode = Node<SectionNodeData, 'section'>

export type FlowNode = ArgumentFlowNode | SectionFlowNode

// Where a node sits. Inside a section, x and y are relative to the section's corner.
export type NodePosition = { x: number; y: number; sectionId: string | null }
export type Positions = Record<string, NodePosition>

// Lays nodes out left to right with dagre: evidence on the left, the claims it
// supports to the right. Returns top-left corners, none of them in a section.
export function initialPositions(graph: PaperGraph): Positions {
  const g = new Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 24, ranksep: 90, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const node of graph.nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const edge of graph.edges) {
    g.setEdge(edge.from, edge.to)
  }

  layout(g)

  const positions: Positions = {}
  for (const node of graph.nodes) {
    const { x, y } = g.node(node.id)
    // dagre gives the center; React Flow wants the top-left corner.
    positions[node.id] = { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2, sectionId: null }
  }
  return positions
}

// Builds React Flow nodes. Sections come first because React Flow needs a
// parent before its children.
export function toFlowNodes(
  graph: PaperGraph,
  positions: Positions,
  sections: Section[],
): FlowNode[] {
  const sectionIds = new Set(sections.map((s) => s.id))

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
      data: { node },
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
    source: edge.from,
    target: edge.to,
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
