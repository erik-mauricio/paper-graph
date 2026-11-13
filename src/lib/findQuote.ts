// Finds a quote inside a rendered pdf.js text layer and returns a DOM Range
// covering it.
//
// PDF text is messy: words are split across spans, lines end in hyphens,
// "fi" may be a single ligature character, and quotes may be curly. So we
// compare a folded version of both texts with whitespace and dashes removed,
// keeping a map from each folded character back to its spot in the DOM.

// Whitespace, soft hyphens, and the various dashes.
const SKIP = /[\s­‐-―-]/

function fold(char: string): string {
  return char
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”„″]/g, '"')
}

function foldAll(text: string): string {
  let out = ''
  for (const char of text) {
    for (const c of fold(char)) {
      if (!SKIP.test(c)) out += c
    }
  }
  return out
}

type Position = { node: Text; offset: number }

export type QuoteMatch = {
  range: Range
  // false when only part of the quote was found.
  exact: boolean
}

export function findQuote(root: HTMLElement, quote: string): QuoteMatch | null {
  const chars: string[] = []
  const positions: Position[] = []

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text
    for (let i = 0; i < text.data.length; i++) {
      for (const c of fold(text.data[i])) {
        if (SKIP.test(c)) continue
        chars.push(c)
        positions.push({ node: text, offset: i })
      }
    }
  }

  const haystack = chars.join('')
  const needle = foldAll(quote)
  if (!needle) return null

  // Try the whole quote, then its start and end, in case the model
  // paraphrased part of it.
  const SNIPPET = 60
  const attempts: [string, boolean][] = [[needle, true]]
  if (needle.length > SNIPPET * 1.5) {
    attempts.push([needle.slice(0, SNIPPET), false])
    attempts.push([needle.slice(-SNIPPET), false])
  }

  for (const [text, exact] of attempts) {
    const index = haystack.indexOf(text)
    if (index === -1) continue

    const start = positions[index]
    const end = positions[index + text.length - 1]
    const range = document.createRange()
    range.setStart(start.node, start.offset)
    range.setEnd(end.node, end.offset + 1)
    return { range, exact }
  }

  return null
}
