import { describe, expect, it } from 'vitest'
import { cleanPages, joinHyphenatedWords, removeRepeatedLines } from './cleanPageText'

describe('removeRepeatedLines', () => {
  const BODY = ['Intro text.', 'Method details.', 'Results table.', 'More results.', 'Discussion.', 'Conclusion.']

  it('drops running headers, including ones that alternate on odd and even pages', () => {
    const pages = BODY.map((body, i) => ({
      page: i + 1,
      text: `${i % 2 ? 'Smith et al.' : 'A Paper Title  UIST ’23'}\n${body}\n${i + 1}`,
    }))
    expect(removeRepeatedLines(pages).map((p) => p.text)).toEqual(BODY)
  })

  it('treats lines that differ only by numbers as the same line ("Page 3" = "Page 4")', () => {
    const pages = BODY.map((body, i) => ({ page: i + 1, text: `Page ${i + 1} of 6\n${body}` }))
    expect(removeRepeatedLines(pages).map((p) => p.text)).toEqual(BODY)
  })

  it('leaves short papers alone', () => {
    const pages = [{ page: 1, text: 'Header\nA' }, { page: 2, text: 'Header\nB' }]
    expect(removeRepeatedLines(pages)).toEqual(pages)
  })
})

describe('joinHyphenatedWords', () => {
  it('joins words broken across lines', () => {
    expect(joinHyphenatedWords('consoli-\ndation and memory')).toBe('consolidation and memory')
  })

  it('keeps hyphens in the middle of a line', () => {
    expect(joinHyphenatedWords('a well-known effect')).toBe('a well-known effect')
  })
})

describe('cleanPages', () => {
  it('keeps page numbers', () => {
    const out = cleanPages([{ page: 7, text: 'x' }])
    expect(out[0].page).toBe(7)
  })
})
