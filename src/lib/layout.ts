import { Graph, layout } from '@dagrejs/dagre'
import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { GraphNode, PaperGraph } from '../types/graph'

export const NODE_WIDTH = 260
export const NODE_HEIGHT = 112

export type ArgumentNodeData = { node: GraphNode }
export type ArgumentFlowNode = Node<ArgumentNodeData, 'argument'>

// Converts a paper graph into positioned React Flow nodes and edges.
// Layout is left-to-right: evidence on the left, the claims it supports to the right.
export function toFlow(graph: PaperGraph): {
  nodes: ArgumentFlowNode[]
  edges: Edge[]
} {
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

  const nodes: ArgumentFlowNode[] = graph.nodes.map((node) => {
    const { x, y } = g.node(node.id)
    return {
      id: node.id,
      type: 'argument',
      // dagre gives the center; React Flow wants the top-left corner.
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      data: { node },
    }
  })

  const edges: Edge[] = graph.edges.map((edge) => {
    const contradicts = edge.relation === 'contradicts'
    const color = contradicts ? 'var(--color-error)' : 'var(--color-primary)'
    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      // Only label the less common relation; color + dashes carry it too.
      label: contradicts ? 'contradicts' : undefined,
      className: contradicts ? 'edge-contradicts' : 'edge-supports',
      style: {
        stroke: color,
        strokeWidth: 2,
        strokeDasharray: contradicts ? '6 4' : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color },
    }
  })

  return { nodes, edges }
}
