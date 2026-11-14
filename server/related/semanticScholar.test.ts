import { describe, expect, it } from 'vitest'
import {
  findIdentifier,
  findRelatedWork,
  RelatedBusyError,
  titleKeywords,
  titleSimilarity,
  toRelatedPaper,
  type Fetch,
} from './semanticScholar.ts'

// A fake Semantic Scholar: the first route whose pattern matches the URL answers.
function fakeApi(routes: [RegExp, unknown | ((url: string) => Response)][]) {
  const calls: string[] = []
  const fetchFn = (async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)
    for (const [pattern, reply] of routes) {
      if (!pattern.test(url)) continue
      return typeof reply === 'function' ? (reply as (url: string) => Response)(url) : Response.json(reply)
    }
    return new Response('not found', { status: 404 })
  }) as Fetch
  return { fetchFn, calls }
}

const paper = (id: string, extra: Record<string, unknown> = {}) => ({
  paperId: id,
  title: `Paper ${id}`,
  year: 2020,
  authors: [{ name: 'A. One' }, { name: 'B. Two' }, { name: 'C. Three' }, { name: 'D. Four' }],
  citationCount: 10,
  publicationTypes: ['JournalArticle'],
  externalIds: {},
  url: `https://www.semanticscholar.org/paper/${id}`,
  ...extra,
})

describe('findIdentifier', () => {
  it('finds an arXiv id, without its version', () => {
    expect(findIdentifier('Preprint. arXiv:2601.20245v2 [cs.CL] 28 Jan 2026')).toEqual({ kind: 'arxiv', id: '2601.20245' })
  })

  it('finds a DOI and trims trailing punctuation', () => {
    expect(findIdentifier('Published as https://doi.org/10.1038/s41586-020-2649-2.')).toEqual({
      kind: 'doi',
      id: '10.1038/s41586-020-2649-2',
    })
  })

  it('returns null when there is neither', () => {
    expect(findIdentifier('Just a title and some authors')).toBeNull()
  })
})

describe('title helpers', () => {
  it('turns a title into search keywords', () => {
    expect(titleKeywords('Sleep Duration and Memory Consolidation in Undergraduate Students')).toBe(
      'sleep duration memory consolidation undergraduate students',
    )
  })

  it('scores matching titles high and different ones low', () => {
    expect(titleSimilarity('Attention Is All You Need', 'Attention is all you need.')).toBe(1)
    expect(titleSimilarity('Attention Is All You Need', 'Deep Residual Learning')).toBeLessThan(0.3)
  })
})

describe('toRelatedPaper', () => {
  it('links to the DOI, keeps three authors, and marks reviews and meta-analyses', () => {
    const p = toRelatedPaper(paper('x', { externalIds: { DOI: '10.1/abc' }, publicationTypes: ['Review', 'MetaAnalysis'] }))
    expect(p).toMatchObject({ url: 'https://doi.org/10.1/abc', authors: ['A. One', 'B. Two', 'C. Three'], moreAuthors: true })
    expect(p?.kinds).toEqual(['meta-analysis', 'review'])
  })

  it('drops entries without an id or title (references Semantic Scholar could not resolve)', () => {
    expect(toRelatedPaper({ paperId: null, title: 'x' })).toBeNull()
  })
})

describe('findRelatedWork', () => {
  const request = { title: 'Paper me', firstPage: 'arXiv:2601.20245v2', topic: 'sleep memory' }

  it('matches by arXiv id and fills all three lists, without the paper itself or repeats', async () => {
    const { fetchFn, calls } = fakeApi([
      [/\/paper\/ARXIV%3A2601\.20245\?/, paper('me', { title: 'Paper me' })],
      [/\/paper\/search\?/, { data: [paper('r1', { citationCount: 5 }), paper('r2', { citationCount: 50 }), paper('me')] }],
      [/\/paper\/me\/references/, { data: [{ citedPaper: paper('b1', { citationCount: 3 }) }, { citedPaper: paper('r2') }, { citedPaper: { paperId: null } }] }],
      [/\/recommendations\/v1\/papers\/forpaper\/me/, { recommendedPapers: [paper('s1'), paper('b1')] }],
    ])
    const result = await findRelatedWork(request, { fetchFn, apiKey: 'k' })

    expect(result.match).toMatchObject({ id: 'me', how: 'arxiv' })
    // Most-cited review first; the paper itself is left out.
    expect(result.reviews.map((p) => p.id)).toEqual(['r2', 'r1'])
    // r2 was already listed as a review, and the unresolved reference is dropped.
    expect(result.buildsOn.map((p) => p.id)).toEqual(['b1'])
    expect(result.similar.map((p) => p.id)).toEqual(['s1'])
    expect(calls.some((u) => u.includes('publicationTypes=Review,MetaAnalysis'))).toBe(true)
  })

  it('falls back to a title match, and rejects a match for a different title', async () => {
    const good = fakeApi([[/search\/match/, { data: [paper('t', { title: 'Paper me' })] }]])
    expect((await findRelatedWork({ ...request, firstPage: '' }, { fetchFn: good.fetchFn })).match).toMatchObject({
      id: 't',
      how: 'title',
    })

    const wrong = fakeApi([[/search\/match/, { data: [paper('t', { title: 'Something else entirely' })] }]])
    const result = await findRelatedWork({ ...request, firstPage: '' }, { fetchFn: wrong.fetchFn })
    expect(result).toEqual({ match: null, reviews: [], buildsOn: [], similar: [] })
  })

  it('retries a busy reply, then gives up with RelatedBusyError', async () => {
    let tries = 0
    const busy = () => {
      tries++
      return new Response('busy', { status: 429, headers: { 'retry-after': '0.01' } })
    }
    const { fetchFn } = fakeApi([[/./, busy]])
    await expect(findRelatedWork(request, { fetchFn })).rejects.toBeInstanceOf(RelatedBusyError)
    expect(tries).toBe(3)
  })
})
