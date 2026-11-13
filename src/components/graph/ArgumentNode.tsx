import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ArgumentFlowNode } from '../../lib/layout'
import { NODE_HEIGHT, NODE_WIDTH } from '../../lib/layout'
import type { NodeType } from '../../types/graph'

const TYPE_STYLE: Record<NodeType, { label: string; badge: string; border: string }> = {
  claim: { label: 'Claim', badge: 'badge-primary', border: 'border-primary' },
  evidence: { label: 'Evidence', badge: 'badge-secondary', border: 'border-base-300' },
  note: { label: 'Note', badge: 'badge-accent', border: 'border-accent border-dashed' },
}

function ArgumentNode({ data, selected }: NodeProps<ArgumentFlowNode>) {
  const { node } = data
  const style = TYPE_STYLE[node.type]

  return (
    <div
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      className={`flex flex-col gap-1.5 rounded-box border-2 bg-base-100 p-3 shadow-sm transition-shadow ${
        style.border
      } ${selected ? 'shadow-lg ring-2 ring-primary/40' : ''}`}
    >
      {/* Drag from the right handle to another node's left handle to link them. */}
      <Handle type="target" position={Position.Left} className="graph-handle" />

      <div className="flex items-center gap-1.5">
        <span className={`badge badge-sm ${style.badge}`}>{style.label}</span>
        {node.source && <span className="badge badge-ghost badge-xs">p. {node.source.page}</span>}
        {node.origin === 'user' && (
          <span className="badge badge-outline badge-xs" title="You added this">
            yours
          </span>
        )}
        {node.edited && (
          <span className="badge badge-outline badge-xs" title="You changed what the AI wrote">
            edited
          </span>
        )}
        {node.source?.verified === false && (
          <span
            className="badge badge-xs badge-warning ml-auto"
            title="This quote was not found in the paper's text"
          >
            unverified
          </span>
        )}
      </div>

      <p className="line-clamp-3 text-sm leading-snug">{node.text}</p>

      <Handle type="source" position={Position.Right} className="graph-handle" />
    </div>
  )
}

export default ArgumentNode
