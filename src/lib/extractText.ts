import type { PageText } from '../types/graph'
import { loadPdf } from './pdf'

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
function removeRepeatedLines(pages: PageText[]): PageText[] {
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

// Reads the text of every page in a PDF file. Line breaks are kept so section
// headings stay on their own line; words hyphenated across lines are rejoined.
export async function extractText(file: File): Promise<PageText[]> {
  const pdf = await loadPdf(file)
  let pages: PageText[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
      .join('')

    pages.push({ page: pageNumber, text })
  }

  await pdf.loadingTask.destroy()

  if (pages.every((page) => page.text.trim() === '')) {
    throw new Error("No text found. Scanned PDFs aren't supported yet.")
  }

  pages = removeRepeatedLines(pages).map((page) => ({
    ...page,
    // "consoli-\ndation" -> "consolidation"
    text: page.text.replace(/(\w)-[ \t]*\n[ \t]*(\w)/g, '$1$2'),
  }))

  return pages
}
