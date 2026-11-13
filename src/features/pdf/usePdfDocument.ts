// Opens a PDF with pdf.js and reads every page's size up front, so the
// viewer's scroll area has its full height before any page renders.
// Used by PdfViewer.tsx.
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useEffect, useState } from 'react'
import { loadPdf } from './pdf'

export type PageSize = { width: number; height: number }

export function usePdfDocument(file: File) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [sizes, setSizes] = useState<PageSize[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let doc: PDFDocumentProxy | null = null

    loadPdf(file)
      .then(async (loaded) => {
        doc = loaded
        if (cancelled) return
        const pageSizes = await Promise.all(
          Array.from({ length: loaded.numPages }, async (_, i) => {
            const page = await loaded.getPage(i + 1)
            const { width, height } = page.getViewport({ scale: 1 })
            return { width, height }
          }),
        )
        if (cancelled) return
        setSizes(pageSizes)
        setPdf(loaded)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Could not open the PDF.')
        }
      })

    return () => {
      cancelled = true
      void doc?.loadingTask.destroy()
    }
  }, [file])

  return { pdf, sizes, loadError }
}
