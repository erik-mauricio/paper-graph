import type { GraphNode, Relation } from '../types/graph'

type NodeDetailsProps = {
  node: GraphNode
  relation?: Relation
}


function NodeDetails({ node, relation }: NodeDetailsProps) {
  return (
    <div className="flex flex-col gap-2 rounded-box border border-base-300 p-4">
      <div className="flex flex-wrap items-center gap-2">
        {relation && (
          <span
            className={`badge badge-sm badge-soft ${
              relation === 'supports' ? 'badge-primary' : 'badge-error'
            }`}
          >
            {relation}
          </span>
        )}
        {node.type === 'claim' && (
          <span className="badge badge-sm badge-outline">claim</span>
        )}
        <p className="font-medium">{node.text}</p>
      </div>

      <blockquote className="text-sm italic text-base-content/70">
        “{node.source.quote}”
      </blockquote>
      <div className="flex items-center gap-2">
        <p className="text-xs text-base-content/70">Page {node.source.page}</p>
        {node.source.verified === false && (
          <span className="badge badge-sm badge-warning">unverified quote</span>
        )}
      </div>
    </div>
  )
}

export default NodeDetails
