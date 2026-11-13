import { relationToClaim } from '../lib/relations'
import type { GraphNode, Relation } from '../types/graph'
import Quote from './Quote'
import SourceMeta from './SourceMeta'

type NodeDetailsProps = {
  node: GraphNode
  relation?: Relation
  onShowInPdf?: (node: GraphNode) => void
}

function NodeDetails({ node, relation, onShowInPdf }: NodeDetailsProps) {
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
          {node.type === 'claim' && <span className="badge badge-sm badge-outline">claim</span>}
          {node.type === 'note' && <span className="badge badge-sm badge-accent badge-soft">note</span>}
          <p className="min-w-48 flex-1 font-reading font-medium leading-relaxed">{node.text}</p>
        </div>

        {node.source && <Quote text={node.source.quote} />}
        <SourceMeta node={node} onShowInPdf={onShowInPdf} />
      </div>
    </div>
  )
}

export default NodeDetails
