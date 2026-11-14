// A node locked to the screen: floats over the canvas, outside React Flow, so it
// stays put while the graph pans and zooms. Drag it anywhere; click it to jump to
// the node in the graph. Expanded shows the full text and quote; minimized, one line.
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { GraphNode } from '@shared/graph'
import { TYPE_BADGE, TYPE_BORDER, typeLabel } from '@/components/nodeTypes'
import { NODE_WIDTH } from '@/features/graph/model/layout'
import type { Box } from '@/features/graph/canvas/geometry'
import LockIcon from '@/components/LockIcon'
import Quote from '@/components/Quote'

type LockedCardProps = {
  node: GraphNode
  claimLabel?: string
  x: number
  y: number
  expanded: boolean
  // The card was dropped here (canvas pixels, with its real size).
  onMove: (card: Box) => void
  onToggleExpanded: () => void
  onUnlock: () => void
  // Jump to the node in the graph.
  onSelect: () => void
}

// Moves smaller than this count as a click, not a drag.
const DRAG_THRESHOLD = 4

function LockedCard({ node, claimLabel, x, y, expanded, onMove, onToggleExpanded, onUnlock, onSelect }: LockedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  // Where the card is while being dragged; null when it's resting at x, y.
  const [dragAt, setDragAt] = useState<{ x: number; y: number } | null>(null)
  const dragged = useRef(false)
  const title = typeLabel(node.type, claimLabel)

  function onPointerDown(e: ReactPointerEvent) {
    // The header buttons work as buttons, not drag handles.
    if (e.button !== 0 || (e.target as HTMLElement).closest('[data-no-drag]')) return
    const start = { x: e.clientX, y: e.clientY }
    dragged.current = false
    let at = { x, y }

    // Listen on the window so the drag keeps going if the pointer leaves the card.
    const onMovePointer = (ev: PointerEvent) => {
      const dx = ev.clientX - start.x
      const dy = ev.clientY - start.y
      if (!dragged.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      dragged.current = true
      at = { x: x + dx, y: y + dy }
      setDragAt(at)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMovePointer)
      window.removeEventListener('pointerup', onUp)
      if (!dragged.current) return
      const box = cardRef.current?.getBoundingClientRect()
      onMove({ ...at, width: box?.width ?? NODE_WIDTH, height: box?.height ?? 0 })
      setDragAt(null)
    }
    window.addEventListener('pointermove', onMovePointer)
    window.addEventListener('pointerup', onUp)
  }

  const pos = dragAt ?? { x, y }

  return (
    <div
      ref={cardRef}
      role="group"
      aria-label={`Locked: ${title}`}
      style={{ left: pos.x, top: pos.y, width: NODE_WIDTH }}
      className={`absolute z-[5] flex touch-none flex-col gap-1.5 rounded-box border-2 bg-base-100 p-3 shadow-sm select-none ${
        TYPE_BORDER[node.type]
      } ${dragAt ? 'cursor-grabbing shadow-lg' : 'cursor-grab'}`}
      onPointerDown={onPointerDown}
    >
      <div className="flex items-center gap-1.5">
        <span className={`badge badge-sm ${TYPE_BADGE[node.type].className}`}>{title}</span>
        <div className="ml-auto flex" data-no-drag>
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-square"
            aria-expanded={expanded}
            onClick={onToggleExpanded}
          >
            <span className="sr-only">{expanded ? 'Minimize' : 'Expand'}</span>
            <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
          </button>
          <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={onUnlock}>
            <span className="sr-only">Unlock</span>
            <LockIcon />
          </button>
        </div>
      </div>

      {/* Clicking the text (not dragging it) jumps to the node in the graph. */}
      <button
        type="button"
        title="Show in graph"
        className={`cursor-[inherit] text-left font-reading text-sm leading-snug ${expanded ? '' : 'truncate'}`}
        onClick={() => {
          if (!dragged.current) onSelect()
        }}
      >
        {node.text}
      </button>

      {expanded && node.source && <Quote text={node.source.quote} />}
    </div>
  )
}

export default LockedCard
