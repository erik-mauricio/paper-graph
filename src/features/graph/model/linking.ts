// Rules for drawing a new link between two nodes. Used by the canvas
// (canvas/useLinkGestures.ts) and the "+" handle (canvas/ArgumentNode.tsx).
import type { PaperGraph } from '@shared/graph'

// A link can't point at itself, and two nodes can only be linked once
// (in either direction).
export function canLink(graph: PaperGraph, from: string, to: string): boolean {
  return (
    from !== to &&
    graph.nodes.some((n) => n.id === from) &&
    graph.nodes.some((n) => n.id === to) &&
    !graph.edges.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from))
  )
}

// Drawing from A to B means "A is backed by B". But if A is evidence (or a
// note) and B is a claim, the user almost certainly means the claim is the one
// being backed up, so start with that. The relation picker can swap it.
// `backed` is the claim side of the link; `backer` is stored as the link's `from`.
export function orient(graph: PaperGraph, a: string, b: string): { backed: string; backer: string } {
  const typeOf = (id: string) => graph.nodes.find((n) => n.id === id)?.type
  return typeOf(a) !== 'claim' && typeOf(b) === 'claim' ? { backed: b, backer: a } : { backed: a, backer: b }
}
