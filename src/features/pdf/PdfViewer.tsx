// The PDF reader: pages, highlights, text selection (with the annotate toolbar),
// and jumping to a quote or an annotation. Loading and zoom live in
// usePdfDocument.ts and usePdfZoom.ts. Used by PdfPanel.tsx.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { findQuote } from './findQuote'
import { containsPoint, rangeToRects } from './rects'
import type {
  Annotation,
  AnnotationDraft,
  AnnotationGroup,
  FocusRequest,
  Rect,
} from './annotations'
import PdfPage from './PdfPage'
import PdfToolbar from './PdfToolbar'
import SelectionToolbar, { type HighlightOptions } from './SelectionToolbar'
import { usePdfDocument } from './usePdfDocument'
import { usePdfZoom } from './usePdfZoom'

const PAGE_GAP = 16

type Selection = AnnotationDraft & { box: DOMRect }

type PdfViewerProps = {
  file: File
  annotations: Annotation[]
  groups: AnnotationGroup[]
  activeAnnotationId: string | null
  focus: FocusRequest | null
  onHighlight: (draft: AnnotationDraft, options: HighlightOptions) => void
  onAnnotationClick: (id: string) => void
  toolbarEnd?: ReactNode
}

function PdfViewer({
  file,
  annotations,
  groups,
  activeAnnotationId,
  focus,
  onHighlight,
  onAnnotationClick,
  toolbarEnd,
}: PdfViewerProps) {
  const { pdf, sizes, loadError } = usePdfDocument(file)
  const [currentPage, setCurrentPage] = useState(1)

  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const zoom = usePdfZoom(scrollEl, sizes)
  const pageEls = useRef(new Map<number, HTMLDivElement>())
  const textLayers = useRef(new Map<number, HTMLDivElement>())
  // Bumped whenever a page's text layer appears, so pending jumps retry.
  const [textTick, setTextTick] = useState(0)

  const [flash, setFlash] = useState<{ page: number; rects: Rect[] } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)

  const handlePageElement = useCallback((n: number, el: HTMLDivElement | null) => {
    if (el) pageEls.current.set(n, el)
    else pageEls.current.delete(n)
  }, [])

  const handleTextLayer = useCallback((n: number, el: HTMLDivElement | null) => {
    if (el) {
      textLayers.current.set(n, el)
      setTextTick((t) => t + 1)
    } else {
      textLayers.current.delete(n)
    }
  }, [])

  // Scrolls so that a spot on a page sits a third of the way down the view.
  const scrollToSpot = useCallback(
    (pageNumber: number, y: number, smooth: boolean) => {
      const pageEl = pageEls.current.get(pageNumber)
      if (!scrollEl || !pageEl) return
      const top = pageEl.offsetTop + y * pageEl.offsetHeight - scrollEl.clientHeight / 3
      scrollEl.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' })
    },
    [scrollEl],
  )

  // Handle jump requests. A quote jump may need to wait for its page's
  // text layer, so this re-runs as text layers appear.
  const handled = useRef(0)
  useEffect(() => {
    if (!focus || !pdf || focus.nonce === handled.current) return

    const frame = requestAnimationFrame(() => {
      if (focus.kind === 'annotation') {
        const target = annotations.find((a) => a.id === focus.id)
        handled.current = focus.nonce
        setFlash(null)
        if (target) scrollToSpot(target.page, target.rects[0]?.y ?? 0, true)
        return
      }

      const page = Math.min(Math.max(focus.page, 1), pdf.numPages)
      const textEl = textLayers.current.get(page)
      const pageEl = pageEls.current.get(page)
      if (!textEl || !pageEl) {
        // Bring the page on screen so it renders; we'll retry when it does.
        scrollToSpot(page, 0, false)
        return
      }

      handled.current = focus.nonce
      const match = findQuote(textEl, focus.quote)
      if (!match) {
        setFlash(null)
        setNotice(`Couldn't find the exact quote on page ${page}.`)
        scrollToSpot(page, 0, true)
        return
      }

      const rects = rangeToRects(match.range, pageEl)
      setFlash({ page, rects })
      setNotice(match.exact ? null : 'Only part of the quote matched the PDF text.')
      scrollToSpot(page, rects[0]?.y ?? 0, true)
    })

    return () => cancelAnimationFrame(frame)
  }, [focus, pdf, textTick, annotations, scrollToSpot])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  function handleScroll() {
    setSelection(null)
    if (!scrollEl) return
    const line = scrollEl.scrollTop + scrollEl.clientHeight / 2
    let page = 1
    for (const [n, el] of pageEls.current) {
      if (el.offsetTop <= line && n > page) page = n
    }
    setCurrentPage(page)
  }

  // Shortcuts while the pages have focus.
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === 'Escape') setSelection(null)
    else if (e.key === '+' || e.key === '=') zoom.zoomIn()
    else if (e.key === '-') zoom.zoomOut()
    else if (e.key === '0') zoom.fit()
    else return
    e.preventDefault()
  }

  function scrollToPage(n: number) {
    if (!pdf) return
    scrollToSpot(Math.min(Math.max(n, 1), pdf.numPages), 0, true)
  }

  // After a mouse/touch selection, show the annotate toolbar. A plain
  // click on a highlight opens that annotation instead.
  function handlePointerUp(e: React.PointerEvent) {
    const { clientX, clientY } = e
    const hitPage = (e.target as Element).closest<HTMLElement>('[data-page]')

    requestAnimationFrame(() => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelection(null)
        if (hitPage) openHighlightAt(hitPage, clientX, clientY)
        return
      }

      const range = sel.getRangeAt(0)
      const pageEl = closestPage(range.startContainer)
      if (!pageEl || pageEl !== closestPage(range.endContainer)) {
        // Selections across pages aren't supported.
        setSelection(null)
        return
      }

      const text = sel.toString().replace(/\s+/g, ' ').trim()
      const rects = rangeToRects(range, pageEl)
      if (!text || rects.length === 0) {
        setSelection(null)
        return
      }

      setSelection({
        page: Number(pageEl.dataset.page),
        rects,
        text,
        box: range.getBoundingClientRect(),
      })
    })
  }

  function openHighlightAt(pageEl: HTMLElement, clientX: number, clientY: number) {
    const box = pageEl.getBoundingClientRect()
    const x = (clientX - box.left) / box.width
    const y = (clientY - box.top) / box.height
    const page = Number(pageEl.dataset.page)
    // Topmost (newest) first.
    const hit = [...annotations]
      .reverse()
      .find((a) => a.page === page && a.rects.some((r) => containsPoint(r, x, y)))
    if (hit) onAnnotationClick(hit.id)
  }

  function createHighlight(options: HighlightOptions) {
    if (!selection) return
    const { page, rects, text } = selection
    onHighlight({ page, rects, text }, options)
    window.getSelection()?.removeAllRanges()
    setSelection(null)
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div role="alert" className="alert alert-error alert-soft">
          {loadError}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PdfToolbar
        numPages={pdf?.numPages ?? null}
        currentPage={currentPage}
        onGoToPage={scrollToPage}
        scale={zoom.scale}
        fitWidth={zoom.fitWidth}
        onZoomIn={zoom.zoomIn}
        onZoomOut={zoom.zoomOut}
        onFit={zoom.fit}
        end={toolbarEnd}
      />

      <div
        ref={setScrollEl}
        className="relative min-h-0 flex-1 overflow-auto bg-base-300/60 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        onScroll={handleScroll}
        onPointerUp={handlePointerUp}
        tabIndex={0}
        aria-label="PDF pages"
        onKeyDown={handleKeyDown}
      >
        {!pdf && (
          <div className="flex h-full items-center justify-center">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        )}
        {pdf && (
          <div className="flex min-w-max flex-col px-4" style={{ gap: PAGE_GAP }}>
            {sizes.map((size, i) => {
              const n = i + 1
              return (
                <PdfPage
                  key={n}
                  pdf={pdf}
                  pageNumber={n}
                  size={size}
                  scale={zoom.scale}
                  scrollRoot={scrollEl}
                  annotations={annotations.filter((a) => a.page === n)}
                  activeAnnotationId={activeAnnotationId}
                  flashRects={flash?.page === n ? flash.rects : null}
                  onPageElement={handlePageElement}
                  onTextLayer={handleTextLayer}
                />
              )
            })}
          </div>
        )}
      </div>

      {notice && (
        <div className="toast toast-center toast-bottom z-40">
          <div className="alert alert-warning text-sm">{notice}</div>
        </div>
      )}

      {selection && (
        <SelectionToolbar box={selection.box} groups={groups} onHighlight={createHighlight} />
      )}
    </div>
  )
}

function closestPage(node: Node): HTMLElement | null {
  const el = node instanceof Element ? node : node.parentElement
  return el?.closest<HTMLElement>('[data-page]') ?? null
}

export default PdfViewer
