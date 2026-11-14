// "Related work" at the bottom of the Overview: reviews and meta-analyses on the
// topic, the papers this one builds on, and similar papers, all real papers from
// Semantic Scholar with links. Data comes from useRelatedWork (via ResultsPage).
import type { ReactNode } from 'react'
import type { RelatedPaper, RelatedWork } from '@shared/related'
import type { RelatedState } from './useRelatedWork'

type RelatedWorkSectionProps = {
  state: RelatedState
  onRetry: () => void
}

const HOW_MATCHED: Record<NonNullable<RelatedWork['match']>['how'], string> = {
  arxiv: 'by its arXiv id',
  doi: 'by its DOI',
  title: 'by its title',
}

function RelatedWorkSection({ state, onRetry }: RelatedWorkSectionProps) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="related-work" aria-busy={state.status === 'loading'}>
      <div>
        <h2 id="related-work" className="text-lg font-semibold">
          Related work
        </h2>
        <p className="text-sm text-base-content/60">
          Other papers for background and comparison, from{' '}
          <a className="link" href="https://www.semanticscholar.org" target="_blank" rel="noreferrer">
            Semantic Scholar
          </a>
          . These are real, published papers, not AI suggestions.
        </p>
      </div>

      {(state.status === 'idle' || state.status === 'loading') && (
        <div className="flex items-center gap-3 text-sm text-base-content/70">
          <span className="loading loading-spinner loading-sm" aria-hidden="true" />
          Looking up related papers…
        </div>
      )}

      {state.status === 'error' && (
        <div role="alert" className="alert alert-soft alert-warning">
          <span>{state.message}</span>
          <button type="button" className="btn btn-sm" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'done' && <RelatedLists related={state.related} />}
    </section>
  )
}

function RelatedLists({ related }: { related: RelatedWork }) {
  const { match } = related
  return (
    <>
      <p className="text-sm text-base-content/70">
        {match ? (
          <>
            Found this paper on Semantic Scholar {HOW_MATCHED[match.how]}:{' '}
            <a className="link" href={match.url} target="_blank" rel="noreferrer">
              {match.title}
            </a>
          </>
        ) : (
          <>
            Couldn't find this paper on Semantic Scholar (very new papers may not be listed yet), so only reviews on
            its topic are shown.
          </>
        )}
      </p>

      <PaperList
        title="Reviews and meta-analyses"
        hint="Overviews of the research area. A good place to start for background."
        papers={related.reviews}
        empty="No reviews or meta-analyses found on this topic."
      />
      {match && (
        <>
          <PaperList
            title="Builds on"
            hint="The most-cited papers this one references."
            papers={related.buildsOn}
            empty="Semantic Scholar doesn't list this paper's references."
          />
          <PaperList
            title="Similar papers"
            hint="Papers Semantic Scholar recommends as similar."
            papers={related.similar}
            empty="No similar papers found yet."
          />
        </>
      )}
    </>
  )
}

function PaperList({ title, hint, papers, empty }: { title: string; hint: string; papers: RelatedPaper[]; empty: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold text-base-content/70">{title}</h3>
        <p className="text-xs text-base-content/60">{hint}</p>
      </div>
      {papers.length ? (
        <ul className="flex flex-col gap-2">
          {papers.map((paper) => (
            <li key={paper.id}>
              <PaperCard paper={paper} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-base-content/60">{empty}</p>
      )}
    </div>
  )
}

function PaperCard({ paper }: { paper: RelatedPaper }) {
  const meta: ReactNode[] = []
  if (paper.authors.length) meta.push(paper.authors.join(', ') + (paper.moreAuthors ? ' et al.' : ''))
  if (paper.year) meta.push(paper.year)
  if (paper.venue) meta.push(paper.venue)
  if (paper.citationCount !== null) {
    meta.push(`${paper.citationCount.toLocaleString()} citation${paper.citationCount === 1 ? '' : 's'}`)
  }

  return (
    <div className="card card-border card-sm bg-base-100">
      <div className="card-body gap-1.5">
        <div className="flex flex-wrap items-start gap-2">
          {paper.kinds.map((kind) => (
            <span key={kind} className="badge badge-sm badge-info badge-soft shrink-0">
              {kind === 'review' ? 'Review' : 'Meta-analysis'}
            </span>
          ))}
          <a
            className="link link-hover min-w-48 flex-1 font-reading text-base font-medium leading-snug"
            href={paper.url}
            target="_blank"
            rel="noreferrer"
          >
            {paper.title}
          </a>
        </div>
        {meta.length > 0 && <p className="text-xs text-base-content/60">{meta.join(' · ')}</p>}
        {paper.abstract && (
          <p className="line-clamp-2 font-reading text-sm leading-relaxed text-base-content/80" title={paper.abstract}>
            {paper.abstract}
          </p>
        )}
      </div>
    </div>
  )
}

export default RelatedWorkSection
