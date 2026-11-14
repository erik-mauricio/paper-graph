// One-time tip about the "+", double-click, and L to lock, shown until dismissed.
import { useState } from 'react'

const KEY = 'tip:graph-editing'

function seen(): boolean {
  try {
    return localStorage.getItem(KEY) === 'dismissed'
  } catch {
    return false
  }
}

// One-time hint about how to link and add nodes. Gone for good once dismissed.
function GraphTip() {
  const [hidden, setHidden] = useState(seen)
  if (hidden) return null

  function dismiss() {
    setHidden(true)
    try {
      localStorage.setItem(KEY, 'dismissed')
    } catch {
      // Storage blocked: the tip just comes back next visit.
    }
  }

  return (
    <div
      role="note"
      className="alert alert-info alert-soft alert-vertical w-[min(36rem,calc(100vw-2rem))] py-2 text-sm shadow-md sm:alert-horizontal"
    >
      <span>
        <strong>Tip:</strong> drag the <kbd className="kbd kbd-xs">+</kbd> on a node onto another node
        to link them, or click it for options. Double-click empty space to add a node. Select a node
        and press <kbd className="kbd kbd-xs">L</kbd> to lock it on screen.
      </span>
      <button type="button" className="btn btn-ghost btn-xs" onClick={dismiss}>
        Got it
      </button>
    </div>
  )
}

export default GraphTip
