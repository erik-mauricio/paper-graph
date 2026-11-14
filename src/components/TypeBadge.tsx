// A small tag naming a node's type (Claim, Evidence, Note), so a linked item
// says what it is and not only how it's linked.
import type { NodeType } from '@shared/graph'
import { TYPE_BADGE } from './nodeTypes'

// Outlined, so it reads as secondary to a solid relation badge beside it.
function TypeBadge({ type, className = '' }: { type: NodeType; className?: string }) {
  const { label, className: color } = TYPE_BADGE[type]
  return <span className={`badge badge-sm badge-outline shrink-0 ${color} ${className}`}>{label}</span>
}

export default TypeBadge
