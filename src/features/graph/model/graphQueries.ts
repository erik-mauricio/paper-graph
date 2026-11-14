// Read-only lookups on a graph: claims, the links into or out of a node,
// neighbors, unlinked evidence, claim numbering.
import type { GraphEdge, GraphNode, PaperGraph } from '@shared/graph'

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

// Gets all the links that start at the given node: what it backs up or challenges.
export function getLinksFrom(graph: PaperGraph, nodeId: string): Link[] {
  const links: Link[] = []

  for (const edge of graph.edges) {
    if (edge.from !== nodeId) continue

    const node = graph.nodes.find((n) => n.id === edge.to)
    if (node) links.push({ edge, node })
  }

  return links
}

// Numbers each claim by the claim hierarchy. A claim that backs up another claim
// (a `supports` link between two claims) is its sub-claim. Main claims, which
// back up no other claim, are 1, 2, 3 in node order; sub-claims add a letter
// (1a, 1b), and deeper levels alternate digits and letters (1a1, 1a1a).
//
// - A sub-claim with several parents is numbered under the shallowest one
//   (the lowest-numbered on a tie). Its other links still exist; it just has one label.
// - Claims in a loop that never reaches a main claim have no natural top, so the
//   first of them (in node order) becomes the next main claim.
//
// Evidence and notes get no label. The map's order is outline order
// (1, 1a, 1a1, 1b, 2, ...), so callers can sort claims by it.
export function getClaimLabels(graph: PaperGraph): Map<string, string> {
  const claims = getClaims(graph)
  const isClaim = new Set(claims.map((c) => c.id))

  // Each claim's sub-claims, in node order.
  const subClaims = new Map<string, string[]>(claims.map((c) => [c.id, []]))
  const backsAClaim = new Set<string>()
  for (const claim of claims) {
    for (const edge of graph.edges) {
      if (edge.from !== claim.id || edge.relation !== 'supports') continue
      if (!isClaim.has(edge.to) || edge.to === claim.id) continue
      subClaims.get(edge.to)!.push(claim.id)
      backsAClaim.add(claim.id)
    }
  }

  const labels = new Map<string, string>()
  const depth = new Map<string, number>()
  // The claims numbered directly under each claim, for the outline order.
  const children = new Map<string, string[]>()
  const roots: string[] = []

  // Breadth-first from the given main claims, so each sub-claim is reached
  // first through its shallowest parent.
  function numberFrom(newRoots: string[]) {
    const queue: string[] = []
    for (const id of newRoots) {
      roots.push(id)
      labels.set(id, String(roots.length))
      depth.set(id, 0)
      queue.push(id)
    }
    for (let i = 0; i < queue.length; i++) {
      const parent = queue[i]
      const childDepth = depth.get(parent)! + 1
      const kids: string[] = []
      for (const sub of subClaims.get(parent)!) {
        if (labels.has(sub)) continue
        // Odd depths take letters (1a), even depths take digits (1a1).
        const suffix = childDepth % 2 === 1 ? letters(kids.length) : String(kids.length + 1)
        labels.set(sub, labels.get(parent)! + suffix)
        depth.set(sub, childDepth)
        kids.push(sub)
        queue.push(sub)
      }
      children.set(parent, kids)
    }
  }

  numberFrom(claims.filter((c) => !backsAClaim.has(c.id)).map((c) => c.id))
  // Whatever is left sits in a loop with no main claim above it.
  for (const claim of claims) {
    if (!labels.has(claim.id)) numberFrom([claim.id])
  }

  // Rebuild the map in outline order.
  const ordered = new Map<string, string>()
  const visit = (id: string) => {
    ordered.set(id, labels.get(id)!)
    for (const kid of children.get(id) ?? []) visit(kid)
  }
  for (const root of roots) visit(root)
  return ordered
}

// 0 → a, 25 → z, 26 → aa, 27 → ab, ...
function letters(index: number): string {
  let n = index + 1
  let out = ''
  while (n > 0) {
    n--
    out = String.fromCharCode(97 + (n % 26)) + out
    n = Math.floor(n / 26)
  }
  return out
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
