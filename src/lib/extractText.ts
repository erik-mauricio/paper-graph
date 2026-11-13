import type { PageText } from '../types/graph'
import { loadPdf } from './pdf'

// Reads the text of every page in a PDF file.
export async function extractText(file: File): Promise<PageText[]> {
  const pdf = await loadPdf(file)
  const pages: PageText[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')

    pages.push({ page: pageNumber, text })
  }

  await pdf.loadingTask.destroy()

  if (pages.every((page) => page.text.trim() === '')) {
    throw new Error("No text found. Scanned PDFs aren't supported yet.")
  }

  return pages
}
