// Opens a <dialog> as a modal when it mounts (used by the dialogs in this folder).
import { useEffect, useRef } from 'react'

// Opens a <dialog> as a modal as soon as it mounts. The parent mounts the
// dialog to open it and unmounts it to close it.
export function useDialog() {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])
  return ref
}
