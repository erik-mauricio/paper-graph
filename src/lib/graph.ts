import type { GraphEdge, GraphNode, PaperGraph } from '../types/graph'

// An edge paired with the node it comes from.
export type Link = {
  edge: GraphEdge
  node: GraphNode
}

// Gets all the claims in the graph.
export function getClaims(graph: PaperGraph): GraphNode[] {
  return graph.nodes.filter((node) => node.type === 'claim')
}

// Gets all the links that point at the given node (its evidence and supporting claims).
export function getLinksTo(graph: PaperGraph, nodeId: string): Link[] {
  const links: Link[] = []

  for (const edge of graph.edges) {
    if (edge.to !== nodeId) continue

    const node = graph.nodes.find((n) => n.id === edge.from)
    if (node) links.push({ edge, node })
  }

  return links
}

// Gets evidence that is not connected to anything.
export function getUnlinkedEvidence(graph: PaperGraph): GraphNode[] {
  const linkedIds = new Set<string>()
  for (const edge of graph.edges) {
    linkedIds.add(edge.from)
    linkedIds.add(edge.to)
  }

  return graph.nodes.filter(
    (node) => node.type === 'evidence' && !linkedIds.has(node.id),
  )
}

// Gets all the links that start at the given node (the claims it supports or contradicts).
export function getLinksFrom(graph: PaperGraph, nodeId: string): Link[] {
  const links: Link[] = []

  for (const edge of graph.edges) {
    if (edge.from !== nodeId) continue

    const node = graph.nodes.find((n) => n.id === edge.to)
    if (node) links.push({ edge, node })
  }

  return links
}

// Gets the ids of the node and every node directly linked to it.
export function getNeighborIds(graph: PaperGraph, nodeId: string): Set<string> {
  const ids = new Set([nodeId])
  for (const edge of graph.edges) {
    if (edge.from === nodeId) ids.add(edge.to)
    if (edge.to === nodeId) ids.add(edge.from)
  }
  return ids
}
