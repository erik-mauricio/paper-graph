// Label and badge color for each node type.
import type { NodeType } from '@shared/graph'

export const TYPE_BADGE: Record<NodeType, { label: string; className: string }> = {
  claim: { label: 'Claim', className: 'badge-primary' },
  evidence: { label: 'Evidence', className: 'badge-secondary' },
  note: { label: 'Note', className: 'badge-accent' },
}

// Card border for each node type, on the canvas and on locked cards.
export const TYPE_BORDER: Record<NodeType, string> = {
  claim: 'border-primary',
  evidence: 'border-secondary',
  note: 'border-accent border-dashed',
}

// "Claim 1a" when the node has a number, otherwise just "Claim" / "Evidence" / "Note".
export function typeLabel(type: NodeType, number?: string): string {
  const label = TYPE_BADGE[type].label
  return number ? `${label} ${number}` : label
}
