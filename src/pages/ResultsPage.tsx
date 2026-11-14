// The page after a paper is processed: the graph or list on the left, the PDF
// (optional) on the right, plus the add/edit node dialog and the undo toast.
import { useState, type CSSProperties } from 'react'
import type { PaperGraph, Source } from '@shared/graph'
import AppNavbar from '@/app/AppNavbar'
import GraphView from '@/features/graph/canvas/GraphView'
import { useGraphEditor } from '@/features/graph/editor/useGraphEditor'
import { useNodeForm } from '@/features/graph/editor/useNodeForm'
import NodeFormModal from '@/features/graph/ui/NodeFormModal'
import UndoToast from '@/features/graph/ui/UndoToast'
import ListView from '@/features/list/ListView'
import OverviewView from '@/features/overview/OverviewView'
import RelatedWorkSection from '@/features/related/RelatedWorkSection'
import { useRelatedWork } from '@/features/related/useRelatedWork'
import type { FocusRequest } from '@/features/pdf/annotations'
import PdfPanel from '@/features/pdf/PdfPanel'
import { nextNonce } from '@/features/pdf/pdf'
import { paperKey } from '@/features/pdf/useAnnotations'
import { useSplitPane } from './useSplitPane'
import { DockButton, ViewTab } from './ViewSwitch'

type ResultsPageProps = {
  graph: PaperGraph
  // The uploaded PDF. Null in the dev sample, which has no PDF.
  file: File | null
  // The PDF's first page of text, to look the paper up for related work.
  firstPage: string
  fileName: string
  onReset: () => void
}

type View = 'graph' | 'list' | 'overview'

// Anything that can be shown in the PDF: a node, or a fact in the overview.
type Sourced = { source?: Source }

function ResultsPage({ graph, file, firstPage, fileName, onReset }: ResultsPageProps) {
  const [view, setViewState] = useState<View>('graph')
  // Related work loads the first time the Overview opens, not before.
  const related = useRelatedWork()
  const relatedRequest = { title: graph.title, firstPage, topic: graph.context?.topic }
  function setView(next: View) {
    setViewState(next)
    if (next === 'overview') related.start(relatedRequest)
  }
  // Large screens: the PDF sits beside the graph/list.
  const [pdfOpen, setPdfOpen] = useState(false)
  // Small screens: the dock shows either the graph/list or the PDF.
  const [mobilePdf, setMobilePdf] = useState(false)
  // Stays true once opened, so hiding the PDF keeps its place and zoom.
  const [pdfLoaded, setPdfLoaded] = useState(false)
  const split = useSplitPane()
  const [focus, setFocus] = useState<FocusRequest | null>(null)

  // The user's edits to the graph, saved per paper in this browser.
  const editor = useGraphEditor(file ? `graph:${paperKey(file)}` : 'graph:sample', graph)
  const nodeForm = useNodeForm(editor)

  // Scrolls the PDF to a node's (or fact's) quote, without changing what's on screen.
  function jumpTo(item: Sourced) {
    if (!file || !item.source) return
    setPdfLoaded(true)
    setFocus({ kind: 'quote', page: item.source.page, quote: item.source.quote, nonce: nextNonce() })
  }

  // Opens the PDF and jumps to a node's (or fact's) quote.
  function showInPdf(item: Sourced) {
    if (!file) return
    setPdfOpen(true)
    setMobilePdf(true)
    jumpTo(item)
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
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate font-semibold" title={graph.title}>
                {graph.title}
              </h1>
              {editor.edited && (
                <span
                  className="tooltip tooltip-bottom shrink-0"
                  data-tip="You've changed this graph. Reset it from the ⋯ menu on the graph."
                >
                  <span className="badge badge-outline badge-xs">Edited</span>
                </span>
              )}
            </div>
            <p className="truncate text-xs text-base-content/60">{fileName}</p>
          </div>
        }
        end={
          <>
            <div role="tablist" aria-label="View" className="tabs tabs-box tabs-sm hidden lg:flex">
              <ViewTab label="Graph" active={view === 'graph'} onClick={() => setView('graph')} />
              <ViewTab label="List" active={view === 'list'} onClick={() => setView('list')} />
              <ViewTab label="Overview" active={view === 'overview'} onClick={() => setView('overview')} />
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
              editor={editor}
              onSelectNode={pdfOpen ? jumpTo : undefined}
              onShowInPdf={onShowInPdf}
              onAddNode={nodeForm.openAdd}
              onEditNode={nodeForm.openEdit}
              focusRequest={nodeForm.focus}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              {view === 'list' ? (
                <ListView graph={editor.graph} onShowInPdf={onShowInPdf} />
              ) : (
                <OverviewView
                  context={graph.context}
                  graph={editor.graph}
                  onShowInPdf={onShowInPdf}
                  footer={<RelatedWorkSection state={related.state} onRetry={() => related.retry(relatedRequest)} />}
                />
              )}
            </div>
          )}
        </div>

        {file && pdfLoaded && (
          <>
            <div
              {...split.separatorProps}
              className={`group hidden w-2 shrink-0 cursor-col-resize items-center justify-center border-x border-base-300 bg-base-100 focus-visible:outline-none ${
                pdfOpen ? 'lg:flex' : ''
              }`}
            >
              <span className="h-10 w-1 rounded-full bg-base-300 transition-colors group-hover:bg-primary group-focus-visible:bg-primary" />
            </div>
            <section
              aria-label="Paper PDF"
              className={`min-h-0 min-w-0 flex-1 lg:w-(--pdf-width) lg:flex-none ${
                mobilePdf ? '' : 'hidden'
              } ${pdfOpen ? 'lg:block' : 'lg:hidden'}`}
              style={{ '--pdf-width': `${split.width}%` } as CSSProperties}
            >
              <PdfPanel file={file} quoteFocus={focus} onAddToGraph={nodeForm.openFromHighlight} />
            </section>
          </>
        )}
      </div>

      <nav aria-label="View" className="dock dock-sm static shrink-0 border-t border-base-300 lg:hidden">
        <DockButton label="Graph" active={!mobilePdf && view === 'graph'} onClick={() => showMobile('graph')} />
        <DockButton label="List" active={!mobilePdf && view === 'list'} onClick={() => showMobile('list')} />
        <DockButton label="Overview" active={!mobilePdf && view === 'overview'} onClick={() => showMobile('overview')} />
        <DockButton label="PDF" active={mobilePdf} disabled={!file} onClick={() => showMobile('pdf')} />
      </nav>

      {nodeForm.modalProps && <NodeFormModal {...nodeForm.modalProps} />}

      {editor.undo && (
        <UndoToast
          key={editor.undo.at}
          message={editor.undo.message}
          onUndo={editor.undoDelete}
          onDismiss={editor.dismissUndo}
        />
      )}
    </div>
  )
}

export default ResultsPage
