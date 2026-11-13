// The bar above the PDF: page navigation, zoom, and a slot on the right
// (the Annotations button). Used by PdfViewer.tsx.
import type { ReactNode } from 'react'
import { MAX_SCALE, MIN_SCALE } from './usePdfZoom'

type PdfToolbarProps = {
  numPages: number | null
  currentPage: number
  onGoToPage: (page: number) => void
  scale: number
  fitWidth: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  end?: ReactNode
}

function PdfToolbar({
  numPages,
  currentPage,
  onGoToPage,
  scale,
  fitWidth,
  onZoomIn,
  onZoomOut,
  onFit,
  end,
}: PdfToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-base-300 bg-base-100 px-3 py-2">
      <div className="join">
        <button
          type="button"
          className="btn btn-sm join-item"
          onClick={() => onGoToPage(currentPage - 1)}
          disabled={!numPages || currentPage <= 1}
        >
          <span aria-hidden="true">‹</span>
          <span className="sr-only">Previous page</span>
        </button>
        <input
          key={currentPage}
          type="number"
          min={1}
          max={numPages ?? 1}
          defaultValue={currentPage}
          aria-label={`Page (of ${numPages ?? '?'})`}
          className="input input-sm join-item w-12 [appearance:textfield] text-center [&::-webkit-inner-spin-button]:appearance-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onGoToPage(Number(e.currentTarget.value))
          }}
          onBlur={(e) => {
            const n = Number(e.currentTarget.value)
            if (n !== currentPage) onGoToPage(n)
          }}
        />
        <span className="btn btn-sm join-item pointer-events-none font-normal text-base-content/60">
          / {numPages ?? '–'}
        </span>
        <button
          type="button"
          className="btn btn-sm join-item"
          onClick={() => onGoToPage(currentPage + 1)}
          disabled={!numPages || currentPage >= numPages}
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
          <button type="button" className="btn btn-sm join-item" onClick={onZoomOut} disabled={scale <= MIN_SCALE}>
            <span aria-hidden="true">−</span>
            <span className="sr-only">Zoom out</span>
          </button>
          <span className="btn btn-sm join-item pointer-events-none w-14 font-normal tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button type="button" className="btn btn-sm join-item" onClick={onZoomIn} disabled={scale >= MAX_SCALE}>
            <span aria-hidden="true">+</span>
            <span className="sr-only">Zoom in</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm join-item ${fitWidth ? 'btn-active' : ''}`}
            aria-pressed={fitWidth}
            onClick={onFit}
          >
            Fit
          </button>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">{end}</div>
    </div>
  )
}

export default PdfToolbar
