// How a link is drawn on the canvas. Click it to switch backed by / challenged by,
// or delete it. Registered as the 'argument' edge type in GraphView.tsx.
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'
import { useContext } from 'react'
import type { ArgumentFlowEdge } from '@/features/graph/model/layout'
import { relationButton, relationLabel } from '@/features/graph/model/relations'
import { GraphActionsContext } from './graphActions'

// A link, drawn claim → evidence ("backed by" / "challenged by").
// Click it to switch the relation or delete it.
function ArgumentEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
  data,
}: EdgeProps<ArgumentFlowEdge>) {
  const actions = useContext(GraphActionsContext)
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })
  const relation = data?.relation ?? 'supports'

  return (
    <>
      {/* A wide invisible stroke makes the thin line easy to click. */}
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} interactionWidth={20} />
      <EdgeLabelRenderer>
        <div
          // nodrag/nopan: clicking the chip shouldn't pan the canvas or start a drag.
          className="nodrag nopan absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            // Only the chip takes clicks; the plain label lets them through to nodes.
            pointerEvents: selected ? 'all' : 'none',
          }}
        >
          {selected ? (
            <div className="join shadow-md" role="group" aria-label="Link options">
              <button
                type="button"
                aria-pressed={relation === 'supports'}
                className={`btn btn-xs join-item ${relation === 'supports' ? 'btn-primary' : ''}`}
                onClick={() => actions?.onSetRelation(id, 'supports')}
              >
                {relationButton('supports')}
              </button>
              <button
                type="button"
                aria-pressed={relation === 'contradicts'}
                className={`btn btn-xs join-item ${relation === 'contradicts' ? 'btn-error' : ''}`}
                onClick={() => actions?.onSetRelation(id, 'contradicts')}
              >
                {relationButton('contradicts')}
              </button>
              <button
                type="button"
                className="btn btn-xs join-item"
                onClick={() => actions?.onRemoveLink(id)}
              >
                <span className="sr-only">Delete link</span>✕
              </button>
            </div>
          ) : (
            relation === 'contradicts' && (
              // Only the less common relation gets a label; color + dashes carry it too.
              <span className="rounded-field bg-base-100 px-1 text-[10px] text-error">
                {relationLabel('contradicts', 'claim')}
              </span>
            )
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default ArgumentEdge
