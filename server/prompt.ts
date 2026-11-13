import type { PageText } from '../src/types/graph.ts'

// Bump this whenever INSTRUCTIONS change, so cached graphs from the old prompt are not reused.
export const PROMPT_VERSION = 1

const INSTRUCTIONS = `
You are analyzing a research paper to map its argument.

Find:
1. The paper's title.
2. The main claims the paper argues for (usually 3 to 8). A claim is a conclusion the
   authors want the reader to accept.
3. The evidence for or against those claims: specific results, data, experiments,
   methods, or citations.
4. Links between them. Each link goes FROM a piece of evidence (or a supporting claim)
   TO the claim it supports or contradicts.

Rules:
- Give every item a short "text" summary in your own words (one sentence).
- Give every item a "quote" copied WORD FOR WORD from the paper text below, one or two
  sentences long, plus the page number it appears on. Do not paraphrase quotes.
- Use ids "c1", "c2", ... for claims, "e1", "e2", ... for evidence, and "l1", "l2", ...
  for links.
- Only link to ids you created.
`.trim()

// Builds the full prompt: instructions followed by the paper's text, page by page.
export function buildPrompt(pages: PageText[]): string {
  const paperText = pages
    .map((page) => `--- Page ${page.page} ---\n${page.text}`)
    .join('\n\n')

  return `${INSTRUCTIONS}\n\nPAPER TEXT:\n\n${paperText}`
}
