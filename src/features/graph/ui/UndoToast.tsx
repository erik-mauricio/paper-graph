// "Deleted … · Undo" toast after a delete. Closes itself after a few seconds.
import { useEffect, useRef } from 'react'

const SHOW_MS = 6000

type UndoToastProps = {
  message: string
  onUndo: () => void
  onDismiss: () => void
}

// "Deleted 1 node · Undo" in the corner. Goes away on its own after a few seconds.
// Give it a new `key` for each delete so the timer restarts.
function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  // Keep the latest callback without restarting the timer on every render.
  const dismiss = useRef(onDismiss)
  useEffect(() => {
    dismiss.current = onDismiss
  })
  useEffect(() => {
    const timer = setTimeout(() => dismiss.current(), SHOW_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="toast toast-center z-50 sm:toast-end">
      <div role="status" className="alert alert-horizontal py-2 shadow-lg">
        <span className="text-sm">{message}</span>
        <button type="button" className="btn btn-primary btn-sm" onClick={onUndo}>
          Undo
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={onDismiss}>
          <span className="sr-only">Dismiss</span>✕
        </button>
      </div>
    </div>
  )
}

export default UndoToast
