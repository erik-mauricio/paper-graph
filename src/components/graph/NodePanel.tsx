import { useEffect } from 'react'
import { getLinksFrom, getLinksTo, type Link } from '../../lib/graph'
import type { GraphNode, PaperGraph } from '../../types/graph'
import Quote from '../Quote'
import SourceMeta from '../SourceMeta'

type NodePanelProps = {
  graph: PaperGraph
  node: GraphNode
  onSelect: (id: string) => void
  onClose: () => void
  onShowInPdf?: (node: GraphNode) => void
}

// Details of the selected node, floating over the graph.
function NodePanel({ graph, node, onSelect, onClose, onShowInPdf }: NodePanelProps) {
  const incoming = getLinksTo(graph, node.id)
  const outgoing = getLinksFrom(graph, node.id)
  const isClaim = node.type === 'claim'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <aside
      aria-label={isClaim ? 'Claim details' : 'Evidence details'}
      className="card card-border absolute inset-x-2 bottom-2 z-10 max-h-[60%] bg-base-100 shadow-xl lg:inset-x-auto lg:top-3 lg:right-3 lg:bottom-3 lg:max-h-none lg:w-80"
    >
      <div className="card-body min-h-0 gap-4 overflow-y-auto p-4">
        <div className="flex items-center gap-2">
          <span className={`badge badge-sm ${isClaim ? 'badge-primary' : 'badge-secondary'}`}>
            {isClaim ? 'Claim' : 'Evidence'}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle ml-auto"
            onClick={onClose}
          >
            <span className="sr-only">Close details</span>✕
          </button>
        </div>

        <h2 className="card-title text-base leading-snug">{node.text}</h2>
        <Quote text={node.source.quote} />
        <SourceMeta node={node} />

        {onShowInPdf && (
          <button type="button" className="btn btn-sm btn-block" onClick={() => onShowInPdf(node)}>
            Show in PDF
          </button>
        )}

        <LinkList
          title={isClaim ? 'Backed by' : 'Linked from'}
          empty="Nothing points to this item."
          links={incoming}
          onSelect={onSelect}
        />
        <LinkList
          title="Points to"
          empty="This item doesn't support or contradict anything."
          links={outgoing}
          onSelect={onSelect}
        />
      </div>
    </aside>
  )
}

type LinkListProps = {
  title: string
  empty: string
  links: Link[]
  onSelect: (id: string) => void
}

function LinkList({ title, empty, links, onSelect }: LinkListProps) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">
        {title} ({links.length})
      </h3>
      {links.length === 0 ? (
        <p className="text-sm text-base-content/60">{empty}</p>
      ) : (
        <ul className="list rounded-box border border-base-300">
          {links.map(({ edge, node }) => (
            <li key={edge.id} className="list-row relative items-start p-2 hover:bg-base-200">
              <span
                className={`badge badge-sm badge-soft ${
                  edge.relation === 'supports' ? 'badge-primary' : 'badge-error'
                }`}
              >
                {edge.relation}
              </span>
              {/* The ::after stretches the button over the whole row. */}
              <button
                type="button"
                className="text-left text-sm after:absolute after:inset-0 after:content-['']"
                onClick={() => onSelect(node.id)}
              >
                {node.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default NodePanel
