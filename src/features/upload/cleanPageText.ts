// Cleans up the raw text pdf.js gives us before it's sent to the model.
// Pure functions, so they can be unit-tested without a PDF. Used by extractText.ts.
import type { PageText } from '@shared/graph'

// Lines this long are body text, never a running header or footer.
const MAX_HEADER_LENGTH = 200

// Lines that are only a page number: "4", "- 4 -", "Page 4", "4 of 12".
const PAGE_NUMBER_LINE = /^[\s\-–—]*(page\s+)?\d{1,4}(\s+of\s+\d{1,4})?[\s\-–—]*$/i

// Compares lines ignoring case, spacing, and numbers (so "Page 3" matches "Page 4").
function headerKey(line: string): string {
  return line.trim().toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ')
}

// Removes running headers and footers (journal name, short title, author list,
// page numbers): short lines that repeat on at least a third of the pages.
// A third, not half, because many templates alternate headers on odd and even pages.
export function removeRepeatedLines(pages: PageText[]): PageText[] {
  if (pages.length < 3) return pages

  const pageCounts = new Map<string, number>()
  for (const page of pages) {
    const keys = new Set(
      page.text
        .split('\n')
        .filter((line) => line.trim() && line.length <= MAX_HEADER_LENGTH)
        .map(headerKey),
    )
    for (const key of keys) pageCounts.set(key, (pageCounts.get(key) ?? 0) + 1)
  }

  const isRepeated = (line: string) =>
    line.length <= MAX_HEADER_LENGTH &&
    (pageCounts.get(headerKey(line)) ?? 0) >= Math.max(3, pages.length / 3)

  return pages.map((page) => ({
    ...page,
    text: page.text
      .split('\n')
      .filter((line) => !PAGE_NUMBER_LINE.test(line) && !isRepeated(line))
      .join('\n'),
  }))
}

// "consoli-\ndation" -> "consolidation"
export function joinHyphenatedWords(text: string): string {
  return text.replace(/(\w)-[ \t]*\n[ \t]*(\w)/g, '$1$2')
}

// Everything extractText does after reading the pages.
export function cleanPages(pages: PageText[]): PageText[] {
  return removeRepeatedLines(pages).map((page) => ({ ...page, text: joinHyphenatedWords(page.text) }))
}
