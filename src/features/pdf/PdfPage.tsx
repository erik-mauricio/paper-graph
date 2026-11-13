// One PDF page: its canvas, the selectable text layer, and highlights. Only
// renders while on or near the screen. Used by PdfViewer.tsx.
import { TextLayer, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { HIGHLIGHT_COLORS } from './highlightColors'
import type { Annotation, Rect } from './annotations'

type PdfPageProps = {
  pdf: PDFDocumentProxy
  pageNumber: number
  // Page size in PDF points at 100% zoom.
  size: { width: number; height: number }
  scale: number
  scrollRoot: HTMLElement | null
  annotations: Annotation[]
  activeAnnotationId: string | null
  flashRects: Rect[] | null
  onPageElement: (pageNumber: number, el: HTMLDivElement | null) => void
  onTextLayer: (pageNumber: number, el: HTMLDivElement | null) => void
}

function PdfPage({
  pdf,
  pageNumber,
  size,
  scale,
  scrollRoot,
  annotations,
  activeAnnotationId,
  flashRects,
  onPageElement,
  onTextLayer,
}: PdfPageProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    onPageElement(pageNumber, pageRef.current)
    return () => onPageElement(pageNumber, null)
  }, [pageNumber, onPageElement])

  // Only render pages that are on (or close to) the screen.
  useEffect(() => {
    const el = pageRef.current
    if (!el || !scrollRoot) return
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { root: scrollRoot, rootMargin: '150% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [scrollRoot])

  useEffect(() => {
    const canvas = canvasRef.current
    const textEl = textRef.current
    if (!canvas || !textEl) return

    if (!near) {
      // Free the memory of pages far off screen.
      canvas.width = 0
      canvas.height = 0
      textEl.replaceChildren()
      return
    }

    let cancelled = false
    let renderTask: RenderTask | null = null
    let textLayer: TextLayer | null = null

    async function render() {
      const page = await pdf.getPage(pageNumber)
      if (cancelled || !canvas || !textEl) return

      const viewport = page.getViewport({ scale })
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.floor(viewport.width * ratio)
      canvas.height = Math.floor(viewport.height * ratio)
      renderTask = page.render({
        canvas,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
      })

      textEl.replaceChildren()
      textLayer = new TextLayer({
        textContentSource: page.streamTextContent(),
        container: textEl,
        viewport,
      })
      await textLayer.render()
      if (cancelled) return

      // pdf.js uses this element to keep drag-selections from jumping around.
      const end = document.createElement('div')
      end.className = 'endOfContent'
      textEl.append(end)
      onTextLayer(pageNumber, textEl)

      await renderTask.promise
    }

    render().catch((error: unknown) => {
      if (error instanceof Error && error.name === 'RenderingCancelledException') return
      if (!cancelled) console.error(`Failed to render page ${pageNumber}`, error)
    })

    return () => {
      cancelled = true
      renderTask?.cancel()
      textLayer?.cancel()
      onTextLayer(pageNumber, null)
    }
  }, [near, pdf, pageNumber, scale, onTextLayer])

  return (
    <div
      ref={pageRef}
      data-page={pageNumber}
      className="pdf-page relative mx-auto bg-white shadow-md"
      style={
        {
          width: size.width * scale,
          height: size.height * scale,
          '--scale-factor': scale,
        } as CSSProperties
      }
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {annotations.map((a) =>
          a.rects.map((r, i) => (
            <div
              key={`${a.id}-${i}`}
              className={`pdf-highlight ${a.id === activeAnnotationId ? 'pdf-highlight-active' : ''}`}
              style={{ ...toStyle(r), background: HIGHLIGHT_COLORS[a.color].fill }}
            />
          )),
        )}
        {flashRects?.map((r, i) => (
          <div key={`flash-${i}`} className="pdf-flash" style={toStyle(r)} />
        ))}
      </div>

      <div
        ref={textRef}
        className="textLayer"
        onPointerDown={(e) => e.currentTarget.classList.add('selecting')}
        onPointerUp={(e) => e.currentTarget.classList.remove('selecting')}
      />
    </div>
  )
}

function toStyle(r: Rect): CSSProperties {
  return {
    left: `${r.x * 100}%`,
    top: `${r.y * 100}%`,
    width: `${r.w * 100}%`,
    height: `${r.h * 100}%`,
  }
}

export default PdfPage
