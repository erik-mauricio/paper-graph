// Backed by / challenged by choice shown where a link was just drawn, with Swap.
import { relationButton } from '@/features/graph/model/relations'
import type { Relation } from '@shared/graph'
import Floating from './Floating'

type RelationPickerProps = {
  x: number
  y: number
  // The claim side of the link, and the node backing it up or challenging it.
  backedText: string
  backerText: string
  onPick: (relation: Relation) => void
  // Flip which node is the one being backed up.
  onSwap: () => void
  onClose: () => void
}

// Asked right where the user finished drawing a link. Reads top to bottom:
// "“claim” — backed by / challenged by — “evidence”".
function RelationPicker({ x, y, backedText, backerText, onPick, onSwap, onClose }: RelationPickerProps) {
  function pick(relation: Relation) {
    onPick(relation)
    onClose()
  }

  return (
    <Floating x={x} y={y} onClose={onClose} label="Choose how these are related">
      <div className="card card-border card-sm w-80 bg-base-100 shadow-xl">
        <div className="card-body gap-2">
          <div className="flex items-start gap-2">
            <p className="line-clamp-2 font-reading text-sm font-medium">{backedText}</p>
            <button type="button" className="btn btn-ghost btn-xs btn-circle ml-auto shrink-0" onClick={onClose}>
              <span className="sr-only">Cancel</span>✕
            </button>
          </div>
          <div className="flex items-center gap-1">
            <div className="join flex-1" role="group" aria-label="Relation">
              <button
                type="button"
                autoFocus
                className="btn btn-sm btn-primary join-item flex-1"
                onClick={() => pick('supports')}
              >
                {relationButton('supports')}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-error join-item flex-1"
                onClick={() => pick('contradicts')}
              >
                {relationButton('contradicts')}
              </button>
            </div>
            <div className="tooltip tooltip-left" data-tip="Swap which one is backed up">
              <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onSwap}>
                <span aria-hidden="true">⇅</span>
                <span className="sr-only">Swap</span>
              </button>
            </div>
          </div>
          <p className="line-clamp-2 font-reading text-sm text-base-content/70">{backerText}</p>
        </div>
      </div>
    </Floating>
  )
}

export default RelationPicker
