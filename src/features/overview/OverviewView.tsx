// The Overview view: what the paper is about, the problem behind it, and how
// the study was done (question, design, participants, control and treatment
// groups, measures), then the methods from the graph. The text form of the
// study design; the graph shows the same methods in their own section.
// Related work (from ResultsPage) goes at the end.
import type { ReactNode } from 'react'
import type { Fact, GraphNode, PaperContext, PaperGraph, Source, StudyGroup, StudyKind } from '@shared/graph'
import { getLinksFrom } from '@/features/graph/model/graphQueries'
import NodeDetails from '@/features/list/NodeDetails'
import Quote from '@/components/Quote'
import SourceMeta from '@/components/SourceMeta'
import TypeBadge from '@/components/TypeBadge'

type Sourced = { source?: Source }

type OverviewViewProps = {
  // From the AI graph. Missing for papers processed before overviews existed.
  context?: PaperContext
  // The user's current graph, for its method nodes.
  graph: PaperGraph
  onShowInPdf?: (item: Sourced) => void
  // Shown last: the Related work section.
  footer?: ReactNode
}

const KIND_LABEL: Record<StudyKind, string> = {
  experiment: 'Experiment',
  observational: 'Observational study',
  computational: 'Computational study',
  review: 'Review or meta-analysis',
  theoretical: 'Theoretical paper',
  other: 'Study',
}

const ROLE_STYLE: Record<StudyGroup['role'], { label: string; className: string }> = {
  control: { label: 'Control', className: 'badge-neutral' },
  treatment: { label: 'Treatment', className: 'badge-success' },
  comparison: { label: 'Comparison', className: 'badge-info' },
}

function OverviewView({ context, graph, onShowInPdf, footer }: OverviewViewProps) {
  const methods = graph.nodes.filter((n) => n.type === 'method')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-8">
      {context ? (
        <>
          <section className="flex flex-col gap-2" aria-labelledby="overview-summary">
            <h2 id="overview-summary" className="text-lg font-semibold">
              Summary
            </h2>
            <p className="max-w-prose font-reading leading-relaxed">{context.summary}</p>
          </section>

          {context.background.length > 0 && (
            <FactSection title="Background" hint="The problem the paper takes on, from its introduction.">
              {context.background.map((fact, i) => (
                <FactCard key={i} fact={fact} onShowInPdf={onShowInPdf} />
              ))}
            </FactSection>
          )}

          <StudySection context={context} onShowInPdf={onShowInPdf} />
        </>
      ) : (
        <div role="note" className="alert alert-soft">
          <span>
            No overview for this paper yet: it was processed before overviews were added. Upload it again to get
            one.
          </span>
        </div>
      )}

      {methods.length > 0 && (
        <FactSection
          title={`Methods in the graph (${methods.length})`}
          hint="How each result was produced. These are also in the graph's “Methods & study design” section."
        >
          {methods.map((method) => (
            <MethodItem key={method.id} method={method} graph={graph} onShowInPdf={onShowInPdf} />
          ))}
        </FactSection>
      )}

      {footer}
    </div>
  )
}

function StudySection({ context, onShowInPdf }: { context: PaperContext; onShowInPdf?: (item: Sourced) => void }) {
  const { study } = context
  return (
    <section className="flex flex-col gap-4" aria-labelledby="overview-study">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="overview-study" className="text-lg font-semibold">
          Study design
        </h2>
        <span className="badge badge-outline badge-sm">{KIND_LABEL[study.kind]}</span>
      </div>

      <Subsection title="Research question">
        <FactCard fact={study.question} onShowInPdf={onShowInPdf} />
      </Subsection>

      {study.design.length > 0 && (
        <Subsection title="How it was set up">
          {study.design.map((fact, i) => (
            <FactCard key={i} fact={fact} onShowInPdf={onShowInPdf} />
          ))}
        </Subsection>
      )}

      {study.participants.length > 0 && (
        <Subsection title="Who or what was studied">
          {study.participants.map((fact, i) => (
            <FactCard key={i} fact={fact} onShowInPdf={onShowInPdf} />
          ))}
        </Subsection>
      )}

      <Subsection title="Groups compared">
        {study.groups.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {study.groups.map((group, i) => (
              <GroupCard key={i} group={group} onShowInPdf={onShowInPdf} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-base-content/60">
            This paper doesn't compare a control group with a treatment group.
          </p>
        )}
      </Subsection>

      {study.measures.length > 0 && (
        <Subsection title="What was measured">
          {study.measures.map((fact, i) => (
            <FactCard key={i} fact={fact} onShowInPdf={onShowInPdf} />
          ))}
        </Subsection>
      )}
    </section>
  )
}

function FactSection({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-base-content/60">{hint}</p>
      </div>
      {children}
    </section>
  )
}

function Subsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-base-content/70">{title}</h3>
      {children}
    </div>
  )
}

function FactCard({ fact, onShowInPdf }: { fact: Fact; onShowInPdf?: (item: Sourced) => void }) {
  return (
    <div className="card card-border card-sm bg-base-100">
      <div className="card-body gap-3">
        <p className="font-reading font-medium leading-relaxed">{fact.text}</p>
        <Quote text={fact.source.quote} />
        <SourceMeta node={fact} onShowInPdf={onShowInPdf} />
      </div>
    </div>
  )
}

function GroupCard({ group, onShowInPdf }: { group: StudyGroup; onShowInPdf?: (item: Sourced) => void }) {
  const role = ROLE_STYLE[group.role]
  return (
    <div className="card card-border card-sm bg-base-100">
      <div className="card-body gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge badge-sm ${role.className}`}>{role.label}</span>
          <span className="font-semibold">{group.name}</span>
        </div>
        <p className="font-reading leading-relaxed">{group.description}</p>
        <Quote text={group.source.quote} />
        <SourceMeta node={group} onShowInPdf={onShowInPdf} />
      </div>
    </div>
  )
}

// A method and the results it produced.
function MethodItem({
  method,
  graph,
  onShowInPdf,
}: {
  method: GraphNode
  graph: PaperGraph
  onShowInPdf?: (item: Sourced) => void
}) {
  const produced = getLinksFrom(graph, method.id)
  return (
    <div className="flex flex-col gap-2">
      <NodeDetails node={method} onShowInPdf={onShowInPdf} />
      {produced.length > 0 && (
        <ul className="ml-4 flex flex-col gap-1 border-l-2 border-success/40 pl-3 text-sm">
          {produced.map(({ edge, node }) => (
            <li key={edge.id} className="flex items-start gap-2">
              <span className="shrink-0 text-base-content/60">Led to</span>
              <TypeBadge type={node.type} />
              <span className="font-reading">{node.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default OverviewView
