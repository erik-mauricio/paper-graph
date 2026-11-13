import { describe, expect, it } from 'vitest'
import { trimPaper } from './trimPaper.ts'

const pg = (page: number, text: string) => ({ page, text })

describe('trimPaper', () => {
  it('cuts the references section and everything after it', () => {
    const r = trimPaper([
      pg(1, 'Title\nAbstract\nWe study X.'),
      pg(2, '1 Introduction\nRelated work references prior studies.'),
      pg(3, 'Methods'),
      pg(4, 'Results'),
      pg(5, '6 Conclusion\nWe conclude.\n7 References\n[1] Smith 2020.'),
      pg(6, 'Appendix A\nmore'),
    ])
    expect(r.referencesPage).toBe(5)
    expect(r.pages.map((p) => p.page)).toEqual([1, 2, 3, 4, 5])
    expect(r.pages.at(-1)?.text).toBe('6 Conclusion\nWe conclude.')
  })

  it('ignores a "References" line in the first half of the paper', () => {
    const r = trimPaper([pg(1, 'References\nfake toc'), pg(2, 'body'), pg(3, 'body'), pg(4, 'end')])
    expect(r.referencesPage).toBeNull()
    expect(r.pages).toHaveLength(4)
  })

  it('does not cut on an inline mention', () => {
    const r = trimPaper([pg(1, 'x'), pg(2, 'see the references section for more')])
    expect(r.referencesPage).toBeNull()
    expect(r.pages.at(-1)?.text).toBe('see the references section for more')
  })

  it('matches an uppercase heading', () => {
    const r = trimPaper([pg(1, 'x'), pg(2, 'y'), pg(3, 'REFERENCES\n[1] a')])
    expect(r.referencesPage).toBe(3)
    expect(r.pages.map((p) => p.page)).toEqual([1, 2])
  })

  it('only collapses whitespace when there is no heading', () => {
    const r = trimPaper([pg(1, 'a   b'), pg(2, 'c\n\n\n\nd')])
    expect(r.pages.map((p) => p.text)).toEqual(['a b', 'c\n\nd'])
    expect(r.charsAfter).toBeLessThan(r.charsBefore)
  })
})
