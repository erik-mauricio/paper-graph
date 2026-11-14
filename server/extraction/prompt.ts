// The instructions sent to Gemini with the paper's text. Bump PROMPT_VERSION when
// they change, so cached graphs made with the old prompt aren't reused.
import type { PageText } from '../../shared/graph.ts'

// Bump this whenever INSTRUCTIONS change, so cached graphs from the old prompt are not reused.
export const PROMPT_VERSION = 3

const INSTRUCTIONS = `
You are analyzing a research paper to help a student understand it: what it is about,
how the study was done, and how its argument fits together.

Find:
1. The paper's title.
2. "context", an overview of the paper:
   - "summary": two or three plain-language sentences on what the paper does and finds.
   - "topic": 3 to 6 keywords naming the research topic in general terms, as you would
     type into a search engine to find review articles on it (for example "sleep memory
     consolidation students"). No paper-specific names or acronyms.
   - "background": 1 to 3 points on the problem the paper addresses and why it matters,
     taken from the paper's own introduction or background section.
   - "study": how the study was done.
     - "kind": experiment (the authors assign conditions), observational (they measure
       without intervening), computational (simulations, models, or systems evaluated
       on data), review (a survey or meta-analysis of other work), theoretical (proofs
       or arguments), or other.
     - "question": the research question or goal the study sets out to answer.
     - "design": 0 to 2 points on how the study is set up (for example "randomized,
       between-subjects, two weeks long").
     - "participants": 0 to 2 points on who or what was studied: people and sample size,
       or the datasets and benchmarks used.
     - "groups": every condition the study compares, with its role. "control" is the
       baseline or placebo, "treatment" gets the intervention, "comparison" is any other
       compared condition (a competing method, a different dose). Say exactly what each
       group got or did. Leave this empty if the study compares no groups or conditions.
     - "measures": 1 to 4 points on what was measured or compared to judge the outcome.
3. The main claims the paper argues for (usually 3 to 8). A claim is a conclusion the
   authors want the reader to accept.
4. The evidence for or against those claims: specific results, data, or citations.
5. The methods behind that evidence (usually 2 to 5): the study design, each group or
   condition, and the key procedures or measures. Make these "method" nodes, not
   evidence. Skip this for papers with no methods (theory, opinion).
6. Links between them. Each link goes FROM a piece of evidence (or a supporting claim)
   TO the claim it supports or contradicts, and FROM a method TO the evidence (or claim)
   it produced, with relation "supports".

Rules:
- Give every item a short "text" summary in your own words (one sentence).
- Give every item a "quote" copied WORD FOR WORD from the paper text below, one or two
  sentences long, plus the page number it appears on. Do not paraphrase quotes.
- Never invent details the paper does not state, such as a control group or sample size.
  Leave a list empty instead.
- Use ids "c1", "c2", ... for claims, "e1", "e2", ... for evidence, "m1", "m2", ... for
  methods, and "l1", "l2", ... for links.
- Only link to ids you created.
`.trim()

// Builds the full prompt: instructions followed by the paper's text, page by page.
export function buildPrompt(pages: PageText[]): string {
  const paperText = pages
    .map((page) => `--- Page ${page.page} ---\n${page.text}`)
    .join('\n\n')

  return `${INSTRUCTIONS}\n\nPAPER TEXT:\n\n${paperText}`
}
