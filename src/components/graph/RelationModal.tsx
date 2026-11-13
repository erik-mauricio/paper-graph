import type { Relation } from '../../types/graph'
import { useDialog } from './useDialog'

type RelationModalProps = {
  fromText: string
  toText: string
  onPick: (relation: Relation) => void
  onClose: () => void
}

// Asked right after the user draws a link between two nodes.
function RelationModal({ fromText, toText, onPick, onClose }: RelationModalProps) {
  const ref = useDialog()

  function pick(relation: Relation) {
    onPick(relation)
    onClose()
  }

  return (
    <dialog ref={ref} className="modal modal-bottom sm:modal-middle" onClose={onClose}>
      <div className="modal-box flex flex-col gap-4">
        <h3 className="text-lg font-semibold">How are these related?</h3>
        <div className="flex flex-col gap-2 text-sm">
          <p className="rounded-field border border-base-300 p-2">{fromText}</p>
          <p className="text-center text-base-content/60">…this one…</p>
          <p className="rounded-field border border-base-300 p-2">{toText}</p>
        </div>
        <div className="join w-full" role="group" aria-label="Relation">
          <button type="button" className="btn btn-primary join-item flex-1" onClick={() => pick('supports')}>
            Supports
          </button>
          <button type="button" className="btn btn-error join-item flex-1" onClick={() => pick('contradicts')}>
            Contradicts
          </button>
        </div>
        <div className="modal-action mt-0">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  )
}

export default RelationModal
