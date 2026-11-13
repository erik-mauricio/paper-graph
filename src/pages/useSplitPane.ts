// The draggable divider between the graph/list and the PDF on large screens.
// Width is a percent of the screen; arrow keys nudge it. Used by ResultsPage.tsx.
import { useState, type KeyboardEvent, type PointerEvent } from 'react'

const MIN_WIDTH = 25
const MAX_WIDTH = 75
const KEY_STEP = 5

function clamp(w: number): number {
  return Math.min(Math.max(w, MIN_WIDTH), MAX_WIDTH)
}

export function useSplitPane(initialWidth = 50) {
  const [width, setWidth] = useState(initialWidth)

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    // The PDF is on the right, so its width is the distance from the pointer to the right edge.
    const box = e.currentTarget.parentElement!.getBoundingClientRect()
    const move = (ev: globalThis.PointerEvent) => setWidth(clamp(((box.right - ev.clientX) / box.width) * 100))
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      document.body.style.userSelect = ''
    }
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft') setWidth((w) => clamp(w + KEY_STEP))
    if (e.key === 'ArrowRight') setWidth((w) => clamp(w - KEY_STEP))
  }

  return {
    width,
    // Spread onto the divider element.
    separatorProps: {
      role: 'separator',
      'aria-orientation': 'vertical' as const,
      'aria-label': 'Resize PDF panel',
      'aria-valuenow': Math.round(width),
      'aria-valuemin': MIN_WIDTH,
      'aria-valuemax': MAX_WIDTH,
      tabIndex: 0,
      onPointerDown,
      onKeyDown,
    },
  }
}
