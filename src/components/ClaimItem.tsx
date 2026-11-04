import type { Link } from '../lib/graph'
import type { GraphNode } from '../types/graph'
import NodeDetails from './NodeDetails'

type ClaimItemProps = {
  claim: GraphNode
  links: Link[]
}


function ClaimItem({ claim, links }: ClaimItemProps) {
  return (
    <details className="collapse collapse-arrow border border-base-300 bg-base-100">
      <summary className="collapse-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="badge badge-primary">Claim</span>
          <span className="flex-1 font-semibold">{claim.text}</span>
          <span className="text-sm text-base-content/60">
            {links.length} linked
          </span>
        </div>
      </summary>

      <div className="collapse-content flex flex-col gap-3">
        <p className="text-sm text-base-content/60">
          Page {claim.source.page}: “{claim.source.quote}”
        </p>

        {links.length === 0 && (
          <p className="text-sm text-base-content/60">
            No evidence linked to this claim.
          </p>
        )}

        {links.map(({ edge, node }) => (
          <NodeDetails key={edge.id} node={node} relation={edge.relation} />
        ))}
      </div>
    </details>
  )
}

export default ClaimItem
