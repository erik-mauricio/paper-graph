import { useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'

const MAX_FILE_SIZE_MB = 20

type UploadFormProps = {
  onSubmit: (file: File) => void
}

function UploadForm({ onSubmit }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  function choose(selected: File | null) {
    setFile(null)
    setError(null)

    if (!selected) return

    if (selected.type !== 'application/pdf') {
      setError('Please choose a PDF file.')
      return
    }

    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. The limit is ${MAX_FILE_SIZE_MB} MB.`)
      return
    }

    setFile(selected)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    choose(e.target.files?.[0] ?? null)
    // Let the same file be picked again after an error.
    e.target.value = ''
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setDragging(false)
    choose(e.dataTransfer.files[0] ?? null)
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (file) onSubmit(file)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label
        data-dragging={dragging || undefined}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="flex cursor-pointer flex-col items-center gap-1 rounded-box border-2 border-dashed border-base-300 bg-base-200/50 px-4 py-8 text-center transition-colors focus-within:border-primary hover:border-primary/60 data-dragging:border-primary data-dragging:bg-primary/10"
      >
        <input
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={handleFileChange}
        />
        {file ? (
          <>
            <span className="font-medium break-all">{file.name}</span>
            <span className="text-sm text-base-content/60">
              {(file.size / 1024 / 1024).toFixed(1)} MB ·{' '}
              <span className="link">Change</span>
            </span>
          </>
        ) : (
          <>
            <span className="font-medium">Drop a PDF here</span>
            <span className="text-sm text-base-content/60">
              or <span className="link">browse</span> · up to {MAX_FILE_SIZE_MB} MB
            </span>
          </>
        )}
      </label>

      {error && (
        <div role="alert" className="alert alert-error alert-soft">
          {error}
        </div>
      )}

      <button type="submit" className="btn btn-primary" disabled={!file}>
        Analyze paper
      </button>
    </form>
  )
}

export default UploadForm
