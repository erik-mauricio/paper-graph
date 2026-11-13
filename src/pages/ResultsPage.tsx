import { useState } from 'react'
import ClaimItem from '../components/ClaimItem'
import NodeDetails from '../components/NodeDetails'
import GraphView from '../components/graph/GraphView'
import { getClaims, getLinksTo, getUnlinkedEvidence } from '../lib/graph'
import type { PaperGraph } from '../types/graph'

type ResultsPageProps = {
  graph: PaperGraph
  fileName: string
  onReset: () => void
}

type View = 'graph' | 'list'

function ResultsPage({ graph, fileName, onReset }: ResultsPageProps) {
  const [view, setView] = useState<View>('graph')

  return (
    <div className="flex h-screen flex-col bg-base-200">
      <header className="flex flex-col gap-4 border-b border-base-300 bg-base-100 px-4 pt-16 pb-4 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:pt-4 lg:pr-20">
        <div className="min-w-0">
          <p className="truncate text-sm text-base-content/60">{fileName}</p>
          <h1 className="text-xl font-bold break-words sm:text-2xl">{graph.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" className="tabs tabs-box tabs-sm">
            <button
              role="tab"
              aria-selected={view === 'graph'}
              className={`tab ${view === 'graph' ? 'tab-active' : ''}`}
              onClick={() => setView('graph')}
            >
              Graph
            </button>
            <button
              role="tab"
              aria-selected={view === 'list'}
              className={`tab ${view === 'list' ? 'tab-active' : ''}`}
              onClick={() => setView('list')}
            >
              List
            </button>
          </div>
          <button className="btn btn-sm" onClick={onReset}>
            Upload another paper
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        {view === 'graph' ? (
          <GraphView graph={graph} />
        ) : (
          <div className="h-full overflow-y-auto">
            <ListView graph={graph} />
          </div>
        )}
      </div>
    </div>
  )
}

function ListView({ graph }: { graph: PaperGraph }) {
  const claims = getClaims(graph)
  const unlinkedEvidence = getUnlinkedEvidence(graph)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-8">
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
  )
}

export default ResultsPage
