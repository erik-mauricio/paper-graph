import { getLinksFrom, getLinksTo, type Link } from '../../lib/graph'
import type { GraphNode, PaperGraph } from '../../types/graph'
import NodeDetails from '../NodeDetails'

type NodePanelProps = {
  graph: PaperGraph
  node: GraphNode
  onSelect: (id: string) => void
  onClose: () => void
}

function NodePanel({ graph, node, onSelect, onClose }: NodePanelProps) {
  const incoming = getLinksTo(graph, node.id)
  const outgoing = getLinksFrom(graph, node.id)

  return (
    <aside className="flex max-h-[45vh] flex-col gap-4 overflow-y-auto border-t border-base-300 bg-base-100 p-4 lg:max-h-none lg:w-96 lg:border-t-0 lg:border-l">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {node.type === 'claim' ? 'Claim' : 'Evidence'}
        </h2>
        <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
          <span className="sr-only">Close</span>✕
        </button>
      </div>

      <NodeDetails node={node} />

      <LinkList
        title={node.type === 'claim' ? 'Backed by' : 'Linked from'}
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
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-base-content/70">
        {title} ({links.length})
      </h3>
      {links.length === 0 && (
        <p className="text-sm text-base-content/60">{empty}</p>
      )}
      {links.map(({ edge, node }) => (
        <button
          key={edge.id}
          className="flex items-start gap-2 rounded-field border border-base-300 p-2 text-left text-sm hover:bg-base-200"
          onClick={() => onSelect(node.id)}
        >
          <span
            className={`badge badge-sm badge-soft shrink-0 ${
              edge.relation === 'supports' ? 'badge-primary' : 'badge-error'
            }`}
          >
            {edge.relation}
          </span>
          <span>{node.text}</span>
        </button>
      ))}
    </section>
  )
}

export default NodePanel
