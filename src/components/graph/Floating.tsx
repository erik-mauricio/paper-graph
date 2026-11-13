import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

type FloatingProps = {
  // Where to put the box, in pixels from the canvas's top-left corner.
  x: number
  y: number
  onClose: () => void
  label: string
  children: ReactNode
}

const MARGIN = 8

// A small box floating over the graph (menus, pickers). It stays inside the
// canvas and closes on Escape or a click elsewhere.
function Floating({ x, y, onClose, label, children }: FloatingProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })

  // Nudge it back inside the canvas if it would hang off an edge.
  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.offsetParent as HTMLElement | null
    if (!el || !parent) return
    const maxLeft = parent.clientWidth - el.offsetWidth - MARGIN
    const maxTop = parent.clientHeight - el.offsetHeight - MARGIN
    setPos({
      left: Math.max(MARGIN, Math.min(x, maxLeft)),
      top: Math.max(MARGIN, Math.min(y, maxTop)),
    })
  }, [x, y])

  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current()
    }
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close.current()
    }
    window.addEventListener('keydown', onKey)
    // Capture, so it runs before React Flow handles the click.
    window.addEventListener('pointerdown', onPointer, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer, true)
    }
  }, [])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className="absolute z-30"
      style={{ left: pos.left, top: pos.top }}
    >
      {children}
    </div>
  )
}

export default Floating
