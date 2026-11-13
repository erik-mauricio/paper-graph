import type { PDFDocumentProxy } from 'pdfjs-dist'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { findQuote } from '../../lib/findQuote'
import { loadPdf } from '../../lib/pdf'
import { containsPoint, rangeToRects } from '../../lib/rects'
import type {
  Annotation,
  AnnotationDraft,
  AnnotationGroup,
  FocusRequest,
  Rect,
} from '../../types/annotations'
import PdfPage from './PdfPage'
import SelectionToolbar, { type HighlightOptions } from './SelectionToolbar'

const MIN_SCALE = 0.4
const MAX_SCALE = 4
const ZOOM_STEP = 1.2
const PAGE_GAP = 16

type PageSize = { width: number; height: number }

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
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [sizes, setSizes] = useState<PageSize[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [scale, setScale] = useState(1)
  const [fitWidth, setFitWidth] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)
  const pageEls = useRef(new Map<number, HTMLDivElement>())
  const textLayers = useRef(new Map<number, HTMLDivElement>())
  // Bumped whenever a page's text layer appears, so pending jumps retry.
  const [textTick, setTextTick] = useState(0)

  const [flash, setFlash] = useState<{ page: number; rects: Rect[] } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)

  // Load the document and every page's size up front, so the scroll
  // area has its full height before any page renders.
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

  // In fit-width mode, follow the panel's width.
  useEffect(() => {
    if (!scrollEl || !fitWidth || sizes.length === 0) return
    const widest = Math.max(...sizes.map((s) => s.width))
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      if (width === 0) return // panel hidden
      setScale(clampScale((width - 32) / widest))
    })
    observer.observe(scrollEl)
    return () => observer.disconnect()
  }, [scrollEl, fitWidth, sizes])

  // Keep the same spot in view when zooming.
  const anchor = useRef<number | null>(null)
  function zoomTo(next: number, fit = false) {
    if (scrollEl) {
      anchor.current =
        (scrollEl.scrollTop + scrollEl.clientHeight / 2) / scrollEl.scrollHeight
    }
    setFitWidth(fit)
    setScale(clampScale(next))
  }
  useLayoutEffect(() => {
    if (!scrollEl || anchor.current === null) return
    scrollEl.scrollTo({
      top: anchor.current * scrollEl.scrollHeight - scrollEl.clientHeight / 2,
    })
    anchor.current = null
  }, [scale, scrollEl])

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
    else if (e.key === '+' || e.key === '=') zoomTo(scale * ZOOM_STEP)
    else if (e.key === '-') zoomTo(scale / ZOOM_STEP)
    else if (e.key === '0') zoomTo(scale, true)
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
      <div className="flex flex-wrap items-center gap-2 border-b border-base-300 bg-base-100 px-3 py-2">
        <div className="join">
          <button
            type="button"
            className="btn btn-sm join-item"
            onClick={() => scrollToPage(currentPage - 1)}
            disabled={!pdf || currentPage <= 1}
          >
            <span aria-hidden="true">‹</span>
            <span className="sr-only">Previous page</span>
          </button>
          <input
            key={currentPage}
            type="number"
            min={1}
            max={pdf?.numPages ?? 1}
            defaultValue={currentPage}
            aria-label={`Page (of ${pdf?.numPages ?? '?'})`}
            className="input input-sm join-item w-12 [appearance:textfield] text-center [&::-webkit-inner-spin-button]:appearance-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') scrollToPage(Number(e.currentTarget.value))
            }}
            onBlur={(e) => {
              const n = Number(e.currentTarget.value)
              if (n !== currentPage) scrollToPage(n)
            }}
          />
          <span className="btn btn-sm join-item pointer-events-none font-normal text-base-content/60">
            / {pdf?.numPages ?? '–'}
          </span>
          <button
            type="button"
            className="btn btn-sm join-item"
            onClick={() => scrollToPage(currentPage + 1)}
            disabled={!pdf || currentPage >= pdf.numPages}
          >
            <span aria-hidden="true">›</span>
            <span className="sr-only">Next page</span>
          </button>
        </div>

        <div className="tooltip tooltip-bottom">
          <div className="tooltip-content text-xs">
            Zoom with <kbd className="kbd kbd-xs text-base-content">+</kbd>{' '}
            <kbd className="kbd kbd-xs text-base-content">−</kbd>, fit with{' '}
            <kbd className="kbd kbd-xs text-base-content">0</kbd>
          </div>
          <div className="join">
            <button
              type="button"
              className="btn btn-sm join-item"
              onClick={() => zoomTo(scale / ZOOM_STEP)}
              disabled={scale <= MIN_SCALE}
            >
              <span aria-hidden="true">−</span>
              <span className="sr-only">Zoom out</span>
            </button>
            <span className="btn btn-sm join-item pointer-events-none w-14 font-normal tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              className="btn btn-sm join-item"
              onClick={() => zoomTo(scale * ZOOM_STEP)}
              disabled={scale >= MAX_SCALE}
            >
              <span aria-hidden="true">+</span>
              <span className="sr-only">Zoom in</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm join-item ${fitWidth ? 'btn-active' : ''}`}
              aria-pressed={fitWidth}
              onClick={() => zoomTo(scale, true)}
            >
              Fit
            </button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">{toolbarEnd}</div>
      </div>

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
                  scale={scale}
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

function clampScale(scale: number): number {
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE)
}

function closestPage(node: Node): HTMLElement | null {
  const el = node instanceof Element ? node : node.parentElement
  return el?.closest<HTMLElement>('[data-page]') ?? null
}

export default PdfViewer
