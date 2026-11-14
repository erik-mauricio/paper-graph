// A small tag naming a node's type (Claim, Evidence, Note), so a linked item
// says what it is and not only how it's linked. Claims can carry their number ("Claim 1a").
import type { NodeType } from '@shared/graph'
import { typeLabel, TYPE_BADGE } from './nodeTypes'

type TypeBadgeProps = {
  type: NodeType
  // The claim's number from getClaimLabels.
  number?: string
  className?: string
}

// Outlined, so it reads as secondary to a solid relation badge beside it.
function TypeBadge({ type, number, className = '' }: TypeBadgeProps) {
  return (
    <span className={`badge badge-sm badge-outline shrink-0 ${TYPE_BADGE[type].className} ${className}`}>
      {typeLabel(type, number)}
    </span>
  )
}

export default TypeBadge
