import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

const MAX_FILE_SIZE_MB = 20

type UploadFormProps = {
  onSubmit: (file: File) => void
}

function UploadForm({ onSubmit }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (file) onSubmit(file)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="file"
        accept="application/pdf"
        className="file-input file-input-primary w-full"
        onChange={handleFileChange}
      />

      {file && (
        <p className="text-sm text-base-content/70">
          {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
        </p>
      )}

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
