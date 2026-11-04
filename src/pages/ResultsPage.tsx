import ClaimItem from '../components/ClaimItem'
import NodeDetails from '../components/NodeDetails'
import { getClaims, getLinksTo, getUnlinkedEvidence } from '../lib/graph'
import type { PaperGraph } from '../types/graph'

type ResultsPageProps = {
  graph: PaperGraph
  fileName: string
  onReset: () => void
}

function ResultsPage({ graph, fileName, onReset }: ResultsPageProps) {
  const claims = getClaims(graph)
  const unlinkedEvidence = getUnlinkedEvidence(graph)

  return (
    <div className="min-h-screen bg-base-200">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-base-content/60">{fileName}</p>
            <h1 className="text-3xl font-bold">{graph.title}</h1>
          </div>
          <button className="btn" onClick={onReset}>
            Upload another paper
          </button>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Claims ({claims.length})</h2>
          {claims.map((claim) => (
            <ClaimItem
              key={claim.id}
              claim={claim}
              links={getLinksTo(graph, claim.id)}
            />
          ))}
        </section>

        {unlinkedEvidence.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">
              Unlinked evidence ({unlinkedEvidence.length})
            </h2>
            <p className="text-sm text-base-content/60">
              Evidence that was extracted but not connected to any claim.
            </p>
            {unlinkedEvidence.map((node) => (
              <NodeDetails key={node.id} node={node} />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

export default ResultsPage
