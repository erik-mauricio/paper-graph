import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import AppNavbar from '../components/AppNavbar'
import ClaimItem from '../components/ClaimItem'
import NodeDetails from '../components/NodeDetails'
import GraphView, { type AddNodeRequest, type FocusNodeRequest } from '../components/graph/GraphView'
import NodeFormModal, { type NodeFormValue } from '../components/graph/NodeFormModal'
import UndoToast from '../components/graph/UndoToast'
import PdfPanel from '../components/pdf/PdfPanel'
import { getClaims, getLinksTo, getUnlinkedEvidence } from '../lib/graph'
import { nextNonce } from '../lib/pdf'
import { paperKey } from '../lib/useAnnotations'
import { useGraphEditor } from '../lib/useGraphEditor'
import type { Annotation, FocusRequest } from '../types/annotations'
import type { GraphNode, PaperGraph, Source } from '../types/graph'

type ResultsPageProps = {
  graph: PaperGraph
  // The uploaded PDF. Null in the dev sample, which has no PDF.
  file: File | null
  fileName: string
  onReset: () => void
}

type View = 'graph' | 'list'

// The add/edit node dialog, when it's open.
type NodeForm =
  | {
      mode: 'add'
      initial: NodeFormValue
      source?: Source
      position?: AddNodeRequest['position']
      link?: AddNodeRequest['link']
    }
  | { mode: 'edit'; node: GraphNode; initial: NodeFormValue }

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

  // The user's edits to the graph, saved per paper in this browser.
  const editor = useGraphEditor(file ? `graph:${paperKey(file)}` : 'graph:sample', graph)
  const [nodeForm, setNodeForm] = useState<NodeForm | null>(null)
  const [graphFocus, setGraphFocus] = useState<FocusNodeRequest | null>(null)

  // Opens the add-node form. From the graph it can come with a spot to put the
  // node and a node to link it to; from a highlight it comes with a quote.
  function openAddNode(request: AddNodeRequest & { source?: Source; text?: string } = {}) {
    const { source, text = '', type, position, sectionId = null, link } = request
    setNodeForm({
      mode: 'add',
      source,
      position,
      link,
      initial: {
        type: type ?? (source ? 'evidence' : 'note'),
        text,
        sectionId,
        relation: link?.relation,
      },
    })
  }

  function openEditNode(node: GraphNode) {
    setNodeForm({
      mode: 'edit',
      node,
      initial: { type: node.type, text: node.text, sectionId: editor.positions[node.id]?.sectionId ?? null },
    })
  }

  // A highlight in the PDF becomes an evidence node with a verified quote.
  function addFromHighlight(annotation: Annotation) {
    openAddNode({
      source: { page: annotation.page, quote: annotation.text, verified: true },
      text: annotation.note,
    })
  }

  function saveNodeForm(value: NodeFormValue) {
    if (!nodeForm) return
    if (nodeForm.mode === 'add') {
      const node = editor.addNode(
        { type: value.type, text: value.text, source: nodeForm.source },
        value.sectionId,
        // A spot picked on the canvas only applies if the section wasn't changed in the form.
        value.sectionId === nodeForm.initial.sectionId ? nodeForm.position : undefined,
      )
      const { link } = nodeForm
      if (link) {
        const relation = value.relation ?? link.relation
        if (link.direction === 'in') editor.addEdge(node.id, link.otherId, relation)
        else editor.addEdge(link.otherId, node.id, relation)
      }
      setGraphFocus({ id: node.id, nonce: nextNonce() })
      return
    }

    const { node, initial } = nodeForm
    // Only save real changes, so opening Edit and saving doesn't mark a node "edited".
    if (value.type !== initial.type || value.text !== initial.text) {
      editor.updateNode(node.id, { type: value.type, text: value.text })
    }
    if (value.sectionId !== initial.sectionId) editor.setNodeSection(node.id, value.sectionId)
  }

  // Scrolls the PDF to a node's quote (without changing what's on screen).
  function jumpTo(node: GraphNode) {
    if (!file || !node.source) return
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
              onAddNode={openAddNode}
              onEditNode={openEditNode}
              focusRequest={graphFocus}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              <ListView graph={editor.graph} onShowInPdf={onShowInPdf} />
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
              <PdfPanel file={file} quoteFocus={focus} onAddToGraph={addFromHighlight} />
            </section>
          </>
        )}
      </div>

      <nav aria-label="View" className="dock dock-sm static shrink-0 border-t border-base-300 lg:hidden">
        <DockButton label="Graph" active={!mobilePdf && view === 'graph'} onClick={() => showMobile('graph')} />
        <DockButton label="List" active={!mobilePdf && view === 'list'} onClick={() => showMobile('list')} />
        <DockButton label="PDF" active={mobilePdf} disabled={!file} onClick={() => showMobile('pdf')} />
      </nav>

      {nodeForm && (
        <NodeFormModal
          title={
            nodeForm.mode === 'edit'
              ? 'Edit node'
              : nodeForm.source
                ? 'Add highlight to graph'
                : 'Add a node'
          }
          submitLabel={nodeForm.mode === 'edit' ? 'Save' : 'Add to graph'}
          initial={nodeForm.initial}
          source={nodeForm.mode === 'edit' ? nodeForm.node.source : nodeForm.source}
          sections={editor.sections}
          link={
            nodeForm.mode === 'add' && nodeForm.link
              ? {
                  direction: nodeForm.link.direction,
                  otherText: editor.graph.nodes.find((n) => n.id === nodeForm.link?.otherId)?.text ?? '',
                }
              : undefined
          }
          onSubmit={saveNodeForm}
          onClose={() => setNodeForm(null)}
        />
      )}

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
  const notes = graph.nodes.filter((n) => n.type === 'note')

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

      {notes.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="divider my-0">Your notes ({notes.length})</div>
          {notes.map((node) => (
            <NodeDetails key={node.id} node={node} onShowInPdf={onShowInPdf} />
          ))}
        </section>
      )}
    </div>
  )
}

export default ResultsPage
