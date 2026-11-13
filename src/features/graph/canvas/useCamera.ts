// Moves the graph's view: centers on a node (e.g. one that was just added) and
// refits the graph when the canvas changes width a lot (e.g. the PDF panel
// opens or closes). Used by GraphView.tsx.
import { useReactFlow } from '@xyflow/react'
import { useCallback, useEffect, useRef, type RefObject } from 'react'
import type { Section } from '@shared/graph'
import { absolutePosition } from '@/features/graph/editor/editorState'
import { NODE_HEIGHT, NODE_WIDTH, type Positions } from '@/features/graph/model/layout'
import type { FocusNodeRequest } from './requests'

export const FIT_OPTIONS = { padding: 0.15, maxZoom: 1 }
// Width of the floating details card on large screens, plus its margin.
const CARD_OFFSET = 332
// Ignore small width changes (scrollbars, rounding) when deciding to refit.
const REFIT_MIN_CHANGE = 80

type Options = {
  positions: Positions
  sections: Section[]
  wrapperRef: RefObject<HTMLDivElement | null>
  // While a node is selected, don't refit: the user is looking at it.
  selectedId: string | null
  focusRequest: FocusNodeRequest | null
}

export function useCamera({ positions, sections, wrapperRef, selectedId, focusRequest }: Options) {
  const { setCenter, fitView } = useReactFlow()

  const centerOn = useCallback(
    (id: string) => {
      if (!positions[id]) return
      // Sections hold relative positions, so work out where the node is on the canvas.
      const pos = absolutePosition(positions[id], sections)
      // On large screens the details card covers the right side, so center
      // the node in the space left of it.
      const shift = window.matchMedia('(min-width: 1024px)').matches ? CARD_OFFSET / 2 : 0
      setCenter(pos.x + NODE_WIDTH / 2 + shift, pos.y + NODE_HEIGHT / 2, { zoom: 1, duration: 400 })
    },
    [positions, sections, setCenter],
  )

  // Center on each new focus request once.
  const centeredFocus = useRef<number | null>(null)
  useEffect(() => {
    if (!focusRequest || focusRequest.nonce === centeredFocus.current) return
    centeredFocus.current = focusRequest.nonce
    centerOn(focusRequest.id)
  }, [focusRequest, centerOn])

  // Refit when the canvas changes width a lot, unless a node is selected.
  const selectedRef = useRef(selectedId)
  useEffect(() => {
    selectedRef.current = selectedId
  }, [selectedId])
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    let lastWidth = el.clientWidth
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      if (width === 0 || Math.abs(width - lastWidth) < REFIT_MIN_CHANGE) return
      lastWidth = width
      if (!selectedRef.current) fitView({ ...FIT_OPTIONS, duration: 200 })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fitView, wrapperRef])

  return {
    centerOn,
    fitAll: () => fitView({ ...FIT_OPTIONS, duration: 300 }),
  }
}
