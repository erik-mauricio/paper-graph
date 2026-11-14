// Label and badge color for each node type.
import type { NodeType } from '@shared/graph'

export const TYPE_BADGE: Record<NodeType, { label: string; className: string }> = {
  claim: { label: 'Claim', className: 'badge-primary' },
  evidence: { label: 'Evidence', className: 'badge-secondary' },
  note: { label: 'Note', className: 'badge-accent' },
}
