import { useEffect } from 'react'
import { getLinksFrom, getLinksTo, type Link } from '../../lib/graph'
import type { GraphNode, PaperGraph, Relation, Section } from '../../types/graph'
import Quote from '../Quote'
import SourceMeta from '../SourceMeta'

type NodePanelProps = {
  graph: PaperGraph
  node: GraphNode
  sections: Section[]
  sectionId: string | null
  onSelect: (id: string) => void
  onClose: () => void
  onShowInPdf?: (node: GraphNode) => void
  onEdit: (node: GraphNode) => void
  onDelete: (id: string) => void
  onSetSection: (id: string, sectionId: string | null) => void
  onSetRelation: (edgeId: string, relation: Relation) => void
  onRemoveLink: (edgeId: string) => void
}

const TYPE_BADGE = {
  claim: { label: 'Claim', className: 'badge-primary' },
  evidence: { label: 'Evidence', className: 'badge-secondary' },
  note: { label: 'Note', className: 'badge-accent' },
}

// Details of the selected node, floating over the graph.
function NodePanel({
  graph,
  node,
  sections,
  sectionId,
  onSelect,
  onClose,
  onShowInPdf,
  onEdit,
  onDelete,
  onSetSection,
  onSetRelation,
  onRemoveLink,
}: NodePanelProps) {
  const incoming = getLinksTo(graph, node.id)
  const outgoing = getLinksFrom(graph, node.id)
  const badge = TYPE_BADGE[node.type]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Let an open modal handle its own Escape.
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const linkProps = { onSelect, onSetRelation, onRemoveLink }

  return (
    <aside
      aria-label={`${badge.label} details`}
      className="card card-border absolute inset-x-2 bottom-2 z-10 max-h-[60%] bg-base-100 shadow-xl lg:inset-x-auto lg:top-3 lg:right-3 lg:bottom-3 lg:max-h-none lg:w-80"
    >
      <div className="card-body min-h-0 gap-4 overflow-y-auto p-4">
        <div className="flex items-center gap-1.5">
          <span className={`badge badge-sm ${badge.className}`}>{badge.label}</span>
          {node.origin === 'user' && <span className="badge badge-outline badge-sm">yours</span>}
          {node.edited && <span className="badge badge-outline badge-sm">edited</span>}
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle ml-auto"
            onClick={onClose}
          >
            <span className="sr-only">Close details</span>✕
          </button>
        </div>

        <h2 className="card-title text-base leading-snug">{node.text}</h2>
        {node.source && <Quote text={node.source.quote} />}
        <SourceMeta node={node} />

        <div className="flex flex-wrap gap-2">
          {onShowInPdf && node.source && (
            <button type="button" className="btn btn-sm flex-1" onClick={() => onShowInPdf(node)}>
              Show in PDF
            </button>
          )}
          <button type="button" className="btn btn-sm flex-1" onClick={() => onEdit(node)}>
            Edit
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost text-error"
            onClick={() => onDelete(node.id)}
          >
            Delete
          </button>
        </div>

        {sections.length > 0 && (
          <fieldset className="fieldset py-0">
            <legend className="fieldset-legend pt-0 text-xs tracking-wide text-base-content/60 uppercase">
              Section
            </legend>
            <select
              className="select select-sm w-full"
              value={sectionId ?? ''}
              onChange={(e) => onSetSection(node.id, e.target.value || null)}
            >
              <option value="">None</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </fieldset>
        )}

        <LinkList
          title={node.type === 'claim' ? 'Backed by' : 'Linked from'}
          empty="Nothing points to this item."
          links={incoming}
          {...linkProps}
        />
        <LinkList
          title="Points to"
          empty="Drag from this node's right edge to another node to link them."
          links={outgoing}
          {...linkProps}
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
  onSetRelation: (edgeId: string, relation: Relation) => void
  onRemoveLink: (edgeId: string) => void
}

function LinkList({ title, empty, links, onSelect, onSetRelation, onRemoveLink }: LinkListProps) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold tracking-wide text-base-content/60 uppercase">
        {title} ({links.length})
      </h3>
      {links.length === 0 ? (
        <p className="text-sm text-base-content/60">{empty}</p>
      ) : (
        <ul className="list rounded-box border border-base-300">
          {links.map(({ edge, node }) => {
            const supports = edge.relation === 'supports'
            return (
              <li key={edge.id} className="list-row items-start gap-2 p-2 hover:bg-base-200">
                <div className="tooltip tooltip-right" data-tip="Click to switch">
                  <button
                    type="button"
                    className={`badge badge-sm badge-soft cursor-pointer ${
                      supports ? 'badge-primary' : 'badge-error'
                    }`}
                    onClick={() => onSetRelation(edge.id, supports ? 'contradicts' : 'supports')}
                  >
                    {edge.relation}
                  </button>
                </div>
                <button
                  type="button"
                  className="list-col-grow text-left text-sm"
                  onClick={() => onSelect(node.id)}
                >
                  {node.text}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  onClick={() => onRemoveLink(edge.id)}
                >
                  <span className="sr-only">Remove link</span>✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default NodePanel
