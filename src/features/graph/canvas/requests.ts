// Requests that flow between the graph canvas and the page around it
// (pages/ResultsPage.tsx opens the add-node form; the canvas focuses new nodes).
import type { NodeType, Relation } from '@shared/graph'

// Asks the graph to select and center a node, e.g. one that was just added.
export type FocusNodeRequest = { id: string; nonce: number }

// A request for the add-node form: where to put the new node, and what to link it to.
export type AddNodeRequest = {
  type?: NodeType
  // Top-left corner on the canvas.
  position?: { x: number; y: number }
  sectionId?: string | null
  // 'in': the new node points at `otherId`. 'out': `otherId` points at the new node.
  link?: { otherId: string; direction: 'in' | 'out'; relation: Relation }
}
