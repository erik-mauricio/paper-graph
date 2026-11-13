// The List view: claims with their evidence underneath, then unlinked
// evidence and the user's notes. The alternative to the graph in ResultsPage.
import type { GraphNode, PaperGraph } from '@shared/graph'
import { getClaims, getLinksTo, getUnlinkedEvidence } from '@/features/graph/model/graphQueries'
import ClaimItem from './ClaimItem'
import NodeDetails from './NodeDetails'

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

export default ListView
