import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import AppNavbar from '../components/AppNavbar'
import ClaimItem from '../components/ClaimItem'
import NodeDetails from '../components/NodeDetails'
import GraphView from '../components/graph/GraphView'
import PdfPanel from '../components/pdf/PdfPanel'
import { getClaims, getLinksTo, getUnlinkedEvidence } from '../lib/graph'
import { nextNonce } from '../lib/pdf'
import type { FocusRequest } from '../types/annotations'
import type { GraphNode, PaperGraph } from '../types/graph'

type ResultsPageProps = {
  graph: PaperGraph
  // The uploaded PDF. Null in the dev sample, which has no PDF.
  file: File | null
  fileName: string
  onReset: () => void
}

type View = 'graph' | 'list'

const MIN_PDF_WIDTH = 25
const MAX_PDF_WIDTH = 75

function ResultsPage({ graph, file, fileName, onReset }: ResultsPageProps) {
  const [view, setView] = useState<View>('graph')
  // Large screens: the PDF sits beside the graph/list.
  const [pdfOpen, setPdfOpen] = useState(false)
  // Small screens: the dock shows either the graph/list or the PDF.
  const [mobilePdf, setMobilePdf] = useState(false)
  // Stays true once opened, so hiding the PDF keeps its place and zoom.
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const [pdfWidth, setPdfWidth] = useState(50) // percent of the screen
  const [focus, setFocus] = useState<FocusRequest | null>(null)

  // Scrolls the PDF to a node's quote (without changing what's on screen).
  function jumpTo(node: GraphNode) {
    if (!file) return
    setPdfLoaded(true)
    setFocus({ kind: 'quote', page: node.source.page, quote: node.source.quote, nonce: nextNonce() })
  }

  // Opens the PDF and jumps to a node's quote.
  function showInPdf(node: GraphNode) {
    if (!file) return
    setPdfOpen(true)
    setMobilePdf(true)
    jumpTo(node)
  }

  const onShowInPdf = file ? showInPdf : undefined

  function togglePdf() {
    setPdfLoaded(true)
    setPdfOpen((open) => !open)
  }

  function showMobile(target: View | 'pdf') {
    if (target === 'pdf') {
      setPdfLoaded(true)
      setMobilePdf(true)
    } else {
      setView(target)
      setMobilePdf(false)
    }
  }

  function startResize(e: PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.parentElement!.getBoundingClientRect()
    const move = (ev: globalThis.PointerEvent) =>
      setPdfWidth(clampWidth(((box.right - ev.clientX) / box.width) * 100))
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      document.body.style.userSelect = ''
    }
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  function resizeWithKeys(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft') setPdfWidth((w) => clampWidth(w + 5))
    if (e.key === 'ArrowRight') setPdfWidth((w) => clampWidth(w - 5))
  }

  const pdfTip = !file
    ? 'No PDF in sample mode'
    : pdfOpen
      ? 'Hide the paper'
      : 'Read the paper side by side'

  return (
    <div className="flex h-dvh flex-col bg-base-200">
      <AppNavbar
        onBrandClick={onReset}
        center={
          <div className="flex min-w-0 flex-col px-1">
            <h1 className="truncate font-semibold" title={graph.title}>
              {graph.title}
            </h1>
            <p className="truncate text-xs text-base-content/60">{fileName}</p>
          </div>
        }
        end={
          <>
            <div role="tablist" aria-label="View" className="tabs tabs-box tabs-sm hidden lg:flex">
              <ViewTab label="Graph" active={view === 'graph'} onClick={() => setView('graph')} />
              <ViewTab label="List" active={view === 'list'} onClick={() => setView('list')} />
            </div>
            <div className="tooltip tooltip-bottom hidden lg:block" data-tip={pdfTip}>
              <button
                type="button"
                className={`btn btn-sm ${pdfOpen ? 'btn-active' : ''}`}
                aria-pressed={pdfOpen}
                disabled={!file}
                onClick={togglePdf}
              >
                PDF
              </button>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
              New paper
            </button>
          </>
        }
      />

      <div className="flex min-h-0 flex-1">
        <div className={`min-h-0 min-w-0 flex-1 ${mobilePdf ? 'hidden lg:block' : ''}`}>
          {view === 'graph' ? (
            <GraphView
              graph={graph}
              onSelectNode={pdfOpen ? jumpTo : undefined}
              onShowInPdf={onShowInPdf}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              <ListView graph={graph} onShowInPdf={onShowInPdf} />
            </div>
          )}
        </div>

        {file && pdfLoaded && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize PDF panel"
              aria-valuenow={Math.round(pdfWidth)}
              aria-valuemin={MIN_PDF_WIDTH}
              aria-valuemax={MAX_PDF_WIDTH}
              tabIndex={0}
              className={`group hidden w-2 shrink-0 cursor-col-resize items-center justify-center border-x border-base-300 bg-base-100 focus-visible:outline-none ${
                pdfOpen ? 'lg:flex' : ''
              }`}
              onPointerDown={startResize}
              onKeyDown={resizeWithKeys}
            >
              <span className="h-10 w-1 rounded-full bg-base-300 transition-colors group-hover:bg-primary group-focus-visible:bg-primary" />
            </div>
            <section
              aria-label="Paper PDF"
              className={`min-h-0 min-w-0 flex-1 lg:w-(--pdf-width) lg:flex-none ${
                mobilePdf ? '' : 'hidden'
              } ${pdfOpen ? 'lg:block' : 'lg:hidden'}`}
              style={{ '--pdf-width': `${pdfWidth}%` } as CSSProperties}
            >
              <PdfPanel file={file} quoteFocus={focus} />
            </section>
          </>
        )}
      </div>

      <nav aria-label="View" className="dock dock-sm static shrink-0 border-t border-base-300 lg:hidden">
        <DockButton label="Graph" active={!mobilePdf && view === 'graph'} onClick={() => showMobile('graph')} />
        <DockButton label="List" active={!mobilePdf && view === 'list'} onClick={() => showMobile('list')} />
        <DockButton label="PDF" active={mobilePdf} disabled={!file} onClick={() => showMobile('pdf')} />
      </nav>
    </div>
  )
}

function ViewTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`tab ${active ? 'tab-active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

type DockButtonProps = {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}

function DockButton({ label, active, disabled, onClick }: DockButtonProps) {
  return (
    <button
      type="button"
      className={active ? 'dock-active' : ''}
      aria-current={active ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="dock-label text-sm">{label}</span>
    </button>
  )
}

function clampWidth(w: number): number {
  return Math.min(Math.max(w, MIN_PDF_WIDTH), MAX_PDF_WIDTH)
}

type ListViewProps = {
  graph: PaperGraph
  onShowInPdf?: (node: GraphNode) => void
}

function ListView({ graph, onShowInPdf }: ListViewProps) {
  const claims = getClaims(graph)
  const unlinkedEvidence = getUnlinkedEvidence(graph)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Claims ({claims.length})</h2>
          <p className="text-sm text-base-content/60">
            Open a claim to see the evidence behind it.
          </p>
        </div>
        {claims.map((claim) => (
          <ClaimItem
            key={claim.id}
            claim={claim}
            links={getLinksTo(graph, claim.id)}
            onShowInPdf={onShowInPdf}
          />
        ))}
      </section>

      {unlinkedEvidence.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="divider my-0">Unlinked evidence ({unlinkedEvidence.length})</div>
          <p className="text-sm text-base-content/60">
            Evidence that was extracted but not connected to any claim.
          </p>
          {unlinkedEvidence.map((node) => (
            <NodeDetails key={node.id} node={node} onShowInPdf={onShowInPdf} />
          ))}
        </section>
      )}
    </div>
  )
}

export default ResultsPage
