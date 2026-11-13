// Removes the parts of a paper that never hold claims or evidence (the reference
// list and anything after it) before it's sent to Gemini. Used by gemini.ts.
import type { PageText } from '../../shared/graph.ts'

// A line that is only a references heading, optionally numbered ("7 References").
const REFERENCES_HEADING = /^[ \t]*(\d+\.?[ \t]*)?(references|bibliography|works cited)[ \t]*$/im

export type TrimResult = {
  pages: PageText[]
  // Page where the references section starts, if one was found.
  referencesPage: number | null
  charsBefore: number
  charsAfter: number
}

function totalChars(pages: PageText[]): number {
  return pages.reduce((sum, p) => sum + p.text.length, 0)
}

function collapseWhitespace(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Finds the references heading: the last match in the second half of the paper,
// so a "references" line in the intro or a table of contents is ignored.
function findReferences(pages: PageText[]): { index: number; offset: number } | null {
  const firstCandidate = Math.floor(pages.length / 2)

  for (let i = pages.length - 1; i >= firstCandidate; i--) {
    const matches = [...pages[i].text.matchAll(new RegExp(REFERENCES_HEADING, 'gim'))]
    const last = matches.at(-1)
    if (last?.index !== undefined) return { index: i, offset: last.index }
  }
  return null
}

// Removes the parts of a paper that never hold claims or evidence (the reference
// list and anything after it) and extra whitespace. Page numbers are kept as-is.
export function trimPaper(pages: PageText[]): TrimResult {
  const charsBefore = totalChars(pages)
  let kept = pages
  let referencesPage: number | null = null

  const refs = findReferences(pages)
  if (refs) {
    referencesPage = pages[refs.index].page
    kept = pages.slice(0, refs.index + 1).map((p, i) =>
      i === refs.index ? { ...p, text: p.text.slice(0, refs.offset) } : p,
    )
  }

  kept = kept
    .map((p) => ({ ...p, text: collapseWhitespace(p.text) }))
    .filter((p) => p.text !== '')

  return { pages: kept, referencesPage, charsBefore, charsAfter: totalChars(kept) }
}
