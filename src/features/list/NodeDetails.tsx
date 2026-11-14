// A node card in the List view: text, quote, page, and how it relates to the claim above.
import { relationToClaim } from '@/features/graph/model/relations'
import type { GraphNode, Relation } from '@shared/graph'
import Quote from '@/components/Quote'
import SourceMeta from '@/components/SourceMeta'
import TypeBadge from '@/components/TypeBadge'

type NodeDetailsProps = {
  node: GraphNode
  relation?: Relation
  // The node's number if it's a claim ("1a").
  claimLabel?: string
  onShowInPdf?: (node: GraphNode) => void
}

function NodeDetails({ node, relation, claimLabel, onShowInPdf }: NodeDetailsProps) {
  return (
    <div className="card card-border card-sm bg-base-100">
      <div className="card-body gap-3">
        <div className="flex flex-wrap items-start gap-2">
          {relation && (
            <span
              className={`badge badge-sm badge-soft ${
                relation === 'supports' ? 'badge-primary' : 'badge-error'
              }`}
            >
              {relationToClaim(relation)}
            </span>
          )}
          <TypeBadge type={node.type} number={claimLabel} />
          <p className="min-w-48 flex-1 font-reading font-medium leading-relaxed">{node.text}</p>
        </div>

        {node.source && <Quote text={node.source.quote} />}
        <SourceMeta node={node} onShowInPdf={onShowInPdf} />
      </div>
    </div>
  )
}

export default NodeDetails
