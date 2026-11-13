import { useDialog } from './useDialog'

type ConfirmModalProps = {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}

function ConfirmModal({ title, body, confirmLabel, onConfirm, onClose }: ConfirmModalProps) {
  const ref = useDialog()

  return (
    <dialog ref={ref} className="modal modal-bottom sm:modal-middle" onClose={onClose}>
      <div className="modal-box">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="py-3 text-sm text-base-content/70">{body}</p>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-error"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  )
}

export default ConfirmModal
