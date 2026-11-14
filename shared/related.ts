// Types for related work: other papers found through Semantic Scholar for the
// paper being read. Shared by the server (server/related/) and the app
// (src/features/related/).

// What the app sends to POST /api/related to identify the paper.
export type RelatedRequest = {
  title: string
  // The first page's text, searched for an arXiv id or DOI.
  firstPage: string
  // Keywords for the paper's topic, from the AI (PaperContext.topic).
  topic?: string
}

export type RelatedPaper = {
  // Semantic Scholar's id.
  id: string
  title: string
  year: number | null
  // First few author names.
  authors: string[]
  // True when there are more authors than listed ("et al.").
  moreAuthors: boolean
  venue: string | null
  citationCount: number | null
  // 'review' and 'meta-analysis' when Semantic Scholar marks the paper as one.
  kinds: ('review' | 'meta-analysis')[]
  abstract: string | null
  // The best link: DOI or arXiv when known, otherwise its Semantic Scholar page.
  url: string
}

export type RelatedWork = {
  // The paper we matched in Semantic Scholar. Null when it couldn't be found
  // (very new, or the title didn't match), in which case only `reviews` can be filled.
  match: { id: string; title: string; url: string; how: 'arxiv' | 'doi' | 'title' } | null
  // Reviews and meta-analyses on the same topic.
  reviews: RelatedPaper[]
  // The most-cited papers this one cites: the work it builds on.
  buildsOn: RelatedPaper[]
  // Papers Semantic Scholar recommends as similar.
  similar: RelatedPaper[]
}
