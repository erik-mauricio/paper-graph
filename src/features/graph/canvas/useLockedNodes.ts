// Nodes locked to the screen: floating copies that stay put while the graph
// pans and zooms behind them. Kept for this visit only (not saved, not an edit).
// Toggled from the node toolbar or with L on the selected node. Used by GraphView.tsx.
import { useReactFlow } from '@xyflow/react'
import { useEffect, useState, type RefObject } from 'react'
import type { PaperGraph } from '@shared/graph'
import { NODE_HEIGHT, NODE_WIDTH } from '@/features/graph/model/layout'
import { keepClear, type Box } from './geometry'

// x and y are pixels from the canvas's top-left corner.
export type LockedNode = { id: string; x: number; y: number; expanded: boolean }

// How much of a card must stay on the canvas when the window shrinks: its header.
const MIN_VISIBLE_HEIGHT = 40

type Options = {
  graph: PaperGraph
  wrapperRef: RefObject<HTMLDivElement | null>
  selectedId: string | null
}

export function useLockedNodes({ graph, wrapperRef, selectedId }: Options) {
  const { flowToScreenPosition, getInternalNode } = useReactFlow()
  const [locked, setLocked] = useState<LockedNode[]>([])

  // Locks for nodes that are gone (deleted, or reset away) are kept but not
  // shown, so undoing a delete brings the locked card back too.
  const shown = locked.filter((l) => graph.nodes.some((n) => n.id === l.id))
  const isLocked = (id: string) => shown.some((l) => l.id === id)

  // Moves a card (in canvas pixels) onto the canvas and off the toolbar and panel,
  // which are marked with data-lock-avoid.
  function place(card: Box) {
    const wrapper = wrapperRef.current
    if (!wrapper) return { x: card.x, y: card.y }
    const origin = wrapper.getBoundingClientRect()
    const obstacles = [...wrapper.querySelectorAll('[data-lock-avoid]')].map((el) => {
      const r = el.getBoundingClientRect()
      return { x: r.left - origin.left, y: r.top - origin.top, width: r.width, height: r.height }
    })
    return keepClear(card, { width: origin.width, height: origin.height }, obstacles)
  }

  function lock(id: string) {
    const internal = getInternalNode(id)
    const wrapper = wrapperRef.current
    if (!internal || !wrapper) return
    // Start where the node is on screen right now.
    const screen = flowToScreenPosition(internal.internals.positionAbsolute)
    const origin = wrapper.getBoundingClientRect()
    const spot = place({
      x: screen.x - origin.left,
      y: screen.y - origin.top,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
    setLocked((ls) => [...ls.filter((l) => l.id !== id), { id, ...spot, expanded: true }])
  }

  function unlock(id: string) {
    setLocked((ls) => ls.filter((l) => l.id !== id))
  }

  function toggle(id: string) {
    if (isLocked(id)) unlock(id)
    else lock(id)
  }

  // A card was dropped: `card` is where it ended up and its real size.
  function move(id: string, card: Box) {
    const spot = place(card)
    setLocked((ls) => ls.map((l) => (l.id === id ? { ...l, ...spot } : l)))
  }

  function toggleExpanded(id: string) {
    setLocked((ls) => ls.map((l) => (l.id === id ? { ...l, expanded: !l.expanded } : l)))
  }

  // L locks or unlocks the selected node, unless the user is typing or a dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'l' || e.ctrlKey || e.metaKey || e.altKey) return
      if (!selectedId || document.querySelector('dialog[open]')) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      toggle(selectedId)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // When the canvas shrinks, pull cards back so at least their header shows.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width === 0 || height === 0) return
      setLocked((ls) => {
        const next = ls.map((l) => {
          const spot = keepClear(
            { x: l.x, y: l.y, width: NODE_WIDTH, height: MIN_VISIBLE_HEIGHT },
            { width, height },
            [],
          )
          return spot.x === l.x && spot.y === l.y ? l : { ...l, ...spot }
        })
        // Same array when nothing moved, so React skips the re-render.
        return next.every((l, i) => l === ls[i]) ? ls : next
      })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [wrapperRef])

  return { locked: shown, isLocked, toggle, unlock, move, toggleExpanded }
}
