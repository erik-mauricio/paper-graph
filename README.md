# PaperGraph

PaperGraph turns a research paper into an interactive **argument graph**. Upload a PDF and an AI model (Gemini) pulls out the paper's main claims and the evidence for and against them. It also pulls out how the study was done (its design, its control and treatment groups, and what it measured) and shows that both as an Overview page and as a "Methods & study design" section in the graph. Every node links back to the exact passage in the PDF, so you can check the AI's reading instead of trusting a summary. You can edit the graph, add your own notes and links, group nodes into sections, and highlight the PDF side by side.

It's a course project aimed at students and early-career programmers reading technical papers.

## Quick start

```bash
npm install
echo "GEMINI_API_KEY=your-key" > .env   # optional: GEMINI_MODEL=... to try a model first
# optional, for reliable related-work lookups: SEMANTIC_SCHOLAR_API_KEY=... (free from semanticscholar.org)
npm run dev                             # app on http://localhost:5173, API on :3001
```

Open **http://localhost:5173/?sample** to work on the UI with a built-in sample graph. It needs no API key and makes no Gemini calls.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite (app) and the API server together, with reload |
| `npm run check` | Lint, unit tests, typecheck, and build. **Run before opening a PR.** |
| `npm run test` | Unit tests (Vitest), next to the code as `*.test.ts` |
| `npm run test:e2e` | Browser tests (Playwright, in `e2e/`) against `/?sample` on port 5199. They use your installed Chrome. |
| `npm run typecheck` | TypeScript only |
| `npm run server` | Only the API server |

## How it works

```
Upload PDF ──► extractText (pdf.js, in the browser)
                 └ cleanPageText: line breaks kept, running headers dropped, hyphenated words joined
          ──► POST /api/extract (server/index.ts)
                 ├ cache hit? return the saved graph (server/cache.ts) — no API call
                 └ trimPaper (drop references) ─► Gemini with retries ─► graph JSON (shared/graphSchema.ts)
          ──► verifyQuotes: is each quote really in the paper? fix page numbers
          ──► useGraphEditor: the user's edits on top, saved in localStorage
          ──► Graph view (React Flow) · List view · PDF reader with highlights
```

## Where things live

```
shared/                 types + JSON schema used by both server and app
server/                 Express API: index.ts (routes), cache.ts, extraction/ (Gemini, prompt, trimming),
                        related/ (Semantic Scholar lookups)
src/app/                entry point, top-level flow (App.tsx), navbar, theme toggle
src/pages/              Landing, Loading, Error, Results (the main screen)
src/features/upload/    picking a PDF, reading its text, calling the API, checking quotes
src/features/graph/
  model/                pure graph logic: queries, layout, link rules and wording
  editor/               the user's edits: editorState.ts (pure rules) + useGraphEditor (React + storage)
  canvas/               the React Flow canvas, node/link/section components, linking gestures
  ui/                   panels, menus, dialogs, and toasts around the canvas
src/features/list/      the List view
src/features/overview/  the Overview view: summary, background, study design (groups, measures), methods
src/features/related/   Related work in the Overview: reviews, papers it builds on, similar papers
src/features/pdf/       PDF reader, highlights, annotations sidebar
src/components/         small UI pieces shared by several features
src/styles/             theme.css (daisyUI themes), graph.css, pdf.css
src/data/sampleGraph.ts the sample paper behind /?sample (also used by tests)
e2e/                    Playwright browser tests
```

Imports use aliases: `@/…` is `src/…` and `@shared/…` is `shared/…`. Server code uses relative imports with `.ts` extensions, because it runs directly under `tsx`.

## Things that aren't obvious

- **Link direction.**
  - Links are *stored* supporter → supported: `{ from: evidence, to: claim, relation: 'supports' | 'contradicts' }`.
  - They're *drawn* claim-first: claim → "backed by" / "challenged by" → evidence.
  - `model/layout.ts` (`toFlowEdge`) does the flip. All wording comes from `model/relations.ts`.
- **Drawing a link** from A to B means "A is backed by B", except that drawing from evidence onto a claim defaults to the claim being backed (`model/linking.ts`). The relation picker can swap it.
- **Positions inside a section** are relative to the section's corner. Use `absolutePosition` in `editor/editorState.ts` to get canvas coordinates.
- **Saved graph format.** Edits are saved per paper in localStorage with a `version`. Version 1 saves (from before the claim-first layout) are mirrored left-to-right when loaded. If you change the stored shape, bump the version and handle old saves in `parseSaved`.
- **Cache and prompt.** The server cache key includes `PROMPT_VERSION` (`server/extraction/prompt.ts`). Bump it whenever the prompt changes, or old cached graphs keep being served.
- **Highlight colors** (`features/pdf/highlightColors.ts`) are fixed, not theme colors, because they sit on the white PDF page in both themes. Sections blend them with the theme in `oklab` so the hue doesn't shift.
- **Theme names** (`paper`, `paper-dark`) appear in `styles/theme.css`, `app/ThemeToggle.tsx`, and the pre-paint script in `index.html`. Change all three together.
- **Testing the retry path:** `SIMULATE_BUSY=1 npm run server` makes every Gemini call fail as "busy".

## Stack

React 19 + TypeScript, Vite, Tailwind CSS 4 + daisyUI 5, React Flow (`@xyflow/react`) with dagre layout, pdf.js, Express + `@google/genai`, Vitest, Playwright.
