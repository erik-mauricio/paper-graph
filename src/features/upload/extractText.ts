// Reads each page's text from a PDF with pdf.js, then cleans it (cleanPageText.ts).
// Called by app/App.tsx before asking the server for a graph.
import type { PageText } from '@shared/graph'
import { cleanPages } from './cleanPageText'
import { loadPdf } from '@/features/pdf/pdf'

// Reads the text of every page in a PDF file. Line breaks are kept so section
// headings stay on their own line; words hyphenated across lines are rejoined.
export async function extractText(file: File): Promise<PageText[]> {
  const pdf = await loadPdf(file)
  const pages: PageText[] = []

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

  return cleanPages(pages)
}
