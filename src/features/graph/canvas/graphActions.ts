// Context that gives custom nodes and links (ArgumentNode, ArgumentEdge,
// SectionNode) the actions they need. Provided by GraphView.tsx.
import { createContext } from 'react'
import type { Relation, Section } from '@shared/graph'

type Box = { x: number; y: number; width: number; height: number }

// What custom nodes and links can ask the canvas to do. React Flow only passes
// `data` to them, so the canvas provides these through context instead.
export type GraphActions = {
  // Sections
  onRenameSection: (id: string, name: string) => void
  onColorSection: (id: string, color: Section['color']) => void
  onDeleteSection: (id: string) => void
  onResizeSectionEnd: (id: string, box: Box) => void

  // Nodes
  // The "+" on a node (or "Link" in its toolbar) was clicked; `anchor` is the
  // button's position on screen, for placing the menu.
  onPlusClick: (nodeId: string, anchor: DOMRect) => void
  onEditNode: (nodeId: string) => void
  onDeleteNode: (nodeId: string) => void
  // Whether a link from one node to another would be allowed.
  canLink: (from: string, to: string) => boolean
  // In "link to an existing node" mode: the node the link starts from.
  linkSource: string | null
  // Locking a node pins a copy of it to the screen (see useLockedNodes.ts).
  isLocked: (nodeId: string) => boolean
  onToggleLock: (nodeId: string) => void

  // Links
  onSetRelation: (edgeId: string, relation: Relation) => void
  onRemoveLink: (edgeId: string) => void
}

export const GraphActionsContext = createContext<GraphActions | null>(null)
