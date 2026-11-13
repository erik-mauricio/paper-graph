// Buttons over the graph: + Node, + Section, and the ⋯ menu (Tidy layout, Reset).
import { useState, type MouseEvent } from 'react'
import ConfirmModal from './ConfirmModal'

type GraphToolbarProps = {
  edited: boolean
  onAddNode: () => void
  onAddSection: () => void
  onRelayout: () => void
  onReset: () => void
}

// Buttons over the top-left of the graph for adding things and tidying up.
function GraphToolbar({ edited, onAddNode, onAddSection, onRelayout, onReset }: GraphToolbarProps) {
  const [confirmReset, setConfirmReset] = useState(false)

  // Close the <details> dropdown after picking an item.
  function closeMenu(e: MouseEvent<HTMLElement>) {
    e.currentTarget.closest('details')?.removeAttribute('open')
  }

  return (
    <div className="flex items-center gap-1">
      <div className="join shadow-sm">
        <div className="tooltip tooltip-bottom" data-tip="Add your own claim, evidence, or note">
          <button type="button" className="btn btn-sm join-item" onClick={onAddNode}>
            + Node
          </button>
        </div>
        <div className="tooltip tooltip-bottom" data-tip="Draw a box to group nodes">
          <button type="button" className="btn btn-sm join-item" onClick={onAddSection}>
            + Section
          </button>
        </div>
      </div>
      <details className="dropdown">
        <summary className="btn btn-sm btn-square shadow-sm" aria-label="More graph options">
          ⋯
        </summary>
        <ul className="dropdown-content menu z-20 mt-1 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
          <li>
            <button
              type="button"
              onClick={(e) => {
                closeMenu(e)
                onRelayout()
              }}
            >
              Tidy layout
              <span className="text-xs text-base-content/60">Nodes in sections stay put</span>
            </button>
          </li>
          <li className={edited ? '' : 'menu-disabled'}>
            <button
              type="button"
              className="text-error"
              disabled={!edited}
              onClick={(e) => {
                closeMenu(e)
                setConfirmReset(true)
              }}
            >
              Reset to AI graph
            </button>
          </li>
        </ul>
      </details>

      {confirmReset && (
        <ConfirmModal
          title="Reset to the AI's graph?"
          body="This removes every node, link, section, and edit you made to this paper's graph. It can't be undone."
          confirmLabel="Reset graph"
          onConfirm={onReset}
          onClose={() => setConfirmReset(false)}
        />
      )}
    </div>
  )
}

export default GraphToolbar
