// One claim in the List view, expandable to show its quote and evidence.
import type { Link } from '@/features/graph/model/graphQueries'
import type { GraphNode } from '@shared/graph'
import NodeDetails from './NodeDetails'
import Quote from '@/components/Quote'
import SourceMeta from '@/components/SourceMeta'

type ClaimItemProps = {
  claim: GraphNode
  links: Link[]
  onShowInPdf?: (node: GraphNode) => void
}

function ClaimItem({ claim, links, onShowInPdf }: ClaimItemProps) {
  return (
    <details className="collapse collapse-arrow border border-base-300 bg-base-100">
      <summary className="collapse-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="badge badge-primary badge-sm">Claim</span>
          <span className="flex-1 font-reading font-semibold leading-snug">{claim.text}</span>
          <span className="badge badge-ghost badge-sm shrink-0">
            {links.length} linked
          </span>
        </div>
      </summary>

      <div className="collapse-content flex flex-col gap-3">
        {claim.source && <Quote text={claim.source.quote} />}
        <SourceMeta node={claim} onShowInPdf={onShowInPdf} />

        <div className="divider my-0 text-xs text-base-content/60">
          Evidence ({links.length})
        </div>

        {links.length === 0 && (
          <p className="text-sm text-base-content/60">
            No evidence linked to this claim.
          </p>
        )}

        {links.map(({ edge, node }) => (
          <NodeDetails
            key={edge.id}
            node={node}
            relation={edge.relation}
            onShowInPdf={onShowInPdf}
          />
        ))}
      </div>
    </details>
  )
}

export default ClaimItem
