// Zoom for the PDF viewer: fit-to-width by default (following the panel's
// width), or a fixed scale once the user zooms. Keeps the same spot in view
// while zooming. Used by PdfViewer.tsx.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PageSize } from './usePdfDocument'

export const MIN_SCALE = 0.4
export const MAX_SCALE = 4
const ZOOM_STEP = 1.2
// Room left beside the widest page in fit-width mode.
const FIT_PADDING = 32

function clampScale(scale: number): number {
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE)
}

export function usePdfZoom(scrollEl: HTMLDivElement | null, sizes: PageSize[]) {
  const [scale, setScale] = useState(1)
  const [fitWidth, setFitWidth] = useState(true)

  // In fit-width mode, follow the panel's width.
  useEffect(() => {
    if (!scrollEl || !fitWidth || sizes.length === 0) return
    const widest = Math.max(...sizes.map((s) => s.width))
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      if (width === 0) return // panel hidden
      setScale(clampScale((width - FIT_PADDING) / widest))
    })
    observer.observe(scrollEl)
    return () => observer.disconnect()
  }, [scrollEl, fitWidth, sizes])

  // Keep the same spot in view when zooming.
  const anchor = useRef<number | null>(null)
  function zoomTo(next: number, fit = false) {
    if (scrollEl) {
      anchor.current = (scrollEl.scrollTop + scrollEl.clientHeight / 2) / scrollEl.scrollHeight
    }
    setFitWidth(fit)
    setScale(clampScale(next))
  }
  useLayoutEffect(() => {
    if (!scrollEl || anchor.current === null) return
    scrollEl.scrollTo({ top: anchor.current * scrollEl.scrollHeight - scrollEl.clientHeight / 2 })
    anchor.current = null
  }, [scale, scrollEl])

  return {
    scale,
    fitWidth,
    zoomIn: () => zoomTo(scale * ZOOM_STEP),
    zoomOut: () => zoomTo(scale / ZOOM_STEP),
    fit: () => zoomTo(scale, true),
  }
}
