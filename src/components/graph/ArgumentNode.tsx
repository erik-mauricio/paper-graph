import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ArgumentFlowNode } from '../../lib/layout'
import { NODE_HEIGHT, NODE_WIDTH } from '../../lib/layout'

function ArgumentNode({ data, selected }: NodeProps<ArgumentFlowNode>) {
  const { node } = data
  const isClaim = node.type === 'claim'

  return (
    <div
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      className={`flex flex-col gap-1.5 rounded-box border-2 bg-base-100 p-3 shadow-sm transition-shadow ${
        isClaim ? 'border-primary' : 'border-base-300'
      } ${selected ? 'shadow-lg ring-2 ring-primary/40' : ''}`}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />

      <div className="flex items-center gap-2">
        <span
          className={`badge badge-sm ${isClaim ? 'badge-primary' : 'badge-secondary'}`}
        >
          {isClaim ? 'Claim' : 'Evidence'}
        </span>
        <span className="text-xs text-base-content/60">p. {node.source.page}</span>
        {node.source.verified === false && (
          <span
            className="badge badge-xs badge-warning ml-auto"
            title="This quote was not found in the paper's text"
          >
            unverified
          </span>
        )}
      </div>

      <p className="line-clamp-3 text-sm leading-snug">{node.text}</p>

      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  )
}

export default ArgumentNode
