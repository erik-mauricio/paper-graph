// A claim, evidence, method, or note card on the canvas, with its "+" link handle,
// whole-card drop target, and quick-actions bar. Registered in GraphView.tsx.
import { Handle, NodeToolbar, Position, useConnection, type NodeProps } from '@xyflow/react'
import { useContext } from 'react'
import type { ArgumentFlowNode } from '@/features/graph/model/layout'
import { NODE_HEIGHT, NODE_WIDTH } from '@/features/graph/model/layout'
import type { NodeType } from '@shared/graph'
import { GraphActionsContext } from './graphActions'

const TYPE_STYLE: Record<NodeType, { label: string; badge: string; border: string }> = {
  claim: { label: 'Claim', badge: 'badge-primary', border: 'border-primary' },
  evidence: { label: 'Evidence', badge: 'badge-secondary', border: 'border-secondary' },
  method: { label: 'Method', badge: 'badge-success', border: 'border-success' },
  note: { label: 'Note', badge: 'badge-accent', border: 'border-accent border-dashed' },
}

function ArgumentNode({ id, data, selected }: NodeProps<ArgumentFlowNode>) {
  const { node } = data
  const style = TYPE_STYLE[node.type]
  const actions = useContext(GraphActionsContext)

  // The node a link is being drawn from: by dragging a "+", or in link mode.
  const draggingFrom = useConnection((c) => (c.inProgress ? c.fromNode.id : null))
  const linkingFrom = draggingFrom ?? actions?.linkSource ?? null
  const isLinkSource = linkingFrom === id
  const canDrop = Boolean(linkingFrom && !isLinkSource && actions?.canLink(linkingFrom, id))
  // While linking, nodes that can't take the link fade back.
  const blocked = Boolean(linkingFrom && !isLinkSource && !canDrop)

  return (
    <div
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      className={`relative flex flex-col gap-1.5 rounded-box border-2 bg-base-100 p-3 shadow-sm transition ${
        style.border
      } ${selected ? 'shadow-lg ring-2 ring-primary/40' : ''} ${
        canDrop ? 'outline-2 outline-offset-4 outline-primary outline-dashed' : ''
      } ${blocked ? 'opacity-40' : ''} ${actions?.linkSource && canDrop ? 'cursor-pointer' : ''}`}
    >
      {/* The whole card is where a link can be dropped. It only catches the
          pointer while a link is being drawn, so the card still drags normally. */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectableStart={false}
        className="graph-drop-target"
        style={{ pointerEvents: draggingFrom && !isLinkSource ? 'all' : 'none' }}
      />

      <NodeToolbar isVisible={selected && !linkingFrom} position={Position.Top} offset={8}>
        <div className="join shadow-md" role="toolbar" aria-label="Node actions">
          <button
            type="button"
            className="btn btn-xs join-item"
            onClick={() => actions?.onEditNode(id)}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn btn-xs join-item"
            onClick={(e) => actions?.onPlusClick(id, e.currentTarget.getBoundingClientRect())}
          >
            + Link
          </button>
          <button
            type="button"
            className="btn btn-xs join-item text-error"
            onClick={() => actions?.onDeleteNode(id)}
          >
            Delete
          </button>
        </div>
      </NodeToolbar>

      <div className="flex items-center gap-1.5">
        <span className={`badge badge-sm ${style.badge}`}>
          {data.claimLabel ? `${style.label} ${data.claimLabel}` : style.label}
        </span>
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

      <p className="line-clamp-3 font-reading text-sm leading-snug">{node.text}</p>

      {/* Drag the "+" onto another node to link them, or onto empty space to
          make a new linked node. Click it for more options. */}
      <Handle
        type="source"
        position={Position.Right}
        className="graph-plus"
        title="Drag to link · click for options"
        aria-label="Link this node"
        onClick={(e) => {
          // Open the menu without also selecting the node (and opening its panel).
          e.stopPropagation()
          actions?.onPlusClick(id, e.currentTarget.getBoundingClientRect())
        }}
      >
        <span aria-hidden="true">+</span>
      </Handle>
    </div>
  )
}

export default ArgumentNode
