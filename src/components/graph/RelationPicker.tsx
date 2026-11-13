import type { Relation } from '../../types/graph'
import Floating from './Floating'

type RelationPickerProps = {
  x: number
  y: number
  fromText: string
  toText: string
  onPick: (relation: Relation) => void
  onClose: () => void
}

// Asked right where the user finished drawing a link.
function RelationPicker({ x, y, fromText, toText, onPick, onClose }: RelationPickerProps) {
  function pick(relation: Relation) {
    onPick(relation)
    onClose()
  }

  return (
    <Floating x={x} y={y} onClose={onClose} label="Choose how these are related">
      <div className="card card-border card-sm w-72 bg-base-100 shadow-xl">
        <div className="card-body gap-2">
          <div className="flex items-start gap-2">
            <p className="line-clamp-2 text-sm font-medium">{fromText}</p>
            <button type="button" className="btn btn-ghost btn-xs btn-circle" onClick={onClose}>
              <span className="sr-only">Cancel</span>✕
            </button>
          </div>
          <div className="join w-full" role="group" aria-label="Relation">
            <button
              type="button"
              autoFocus
              className="btn btn-sm btn-primary join-item flex-1"
              onClick={() => pick('supports')}
            >
              Supports
            </button>
            <button
              type="button"
              className="btn btn-sm btn-error join-item flex-1"
              onClick={() => pick('contradicts')}
            >
              Contradicts
            </button>
          </div>
          <p className="line-clamp-2 text-sm text-base-content/70">{toText}</p>
        </div>
      </div>
    </Floating>
  )
}

export default RelationPicker
