// The banner over the top of the graph while linking, or a short idle hint.
import { Panel } from '@xyflow/react'
import { truncate } from './geometry'

type CanvasHintProps = {
  // A link is being dragged from a "+".
  dragging: boolean
  // In "link to an existing node" mode: the text of the node the link starts from.
  linkSourceText: string | null
  // A node's details panel is open (then the idle hint is hidden).
  panelOpen: boolean
  onCancelLink: () => void
}

// The banner over the top of the graph: what to do while linking, or a short
// hint when nothing is happening.
function CanvasHint({ dragging, linkSourceText, panelOpen, onCancelLink }: CanvasHintProps) {
  if (dragging || linkSourceText !== null) {
    return (
      <Panel position="top-center">
        <div role="status" className="alert alert-horizontal py-1.5 text-sm shadow-md">
          {linkSourceText !== null ? (
            <>
              <span>
                Click the node that backs up or challenges <strong>“{truncate(linkSourceText)}”</strong>
              </span>
              <button type="button" className="btn btn-ghost btn-xs" onClick={onCancelLink}>
                Cancel <kbd className="kbd kbd-xs">Esc</kbd>
              </button>
            </>
          ) : (
            <span>Drop on a node to link it · drop on empty space to create a new one</span>
          )}
        </div>
      </Panel>
    )
  }

  if (panelOpen) return null
  return (
    <Panel position="top-right" className="hidden sm:block">
      <span className="badge border-base-300 bg-base-100 text-base-content/70 shadow-sm">
        Click a node to see its quote and links
      </span>
    </Panel>
  )
}

export default CanvasHint
