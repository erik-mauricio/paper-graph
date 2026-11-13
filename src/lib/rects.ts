import type { Rect } from '../types/annotations'

// Turns a DOM Range on a PDF page into page-relative boxes, one per line.
export function rangeToRects(range: Range, pageEl: HTMLElement): Rect[] {
  const page = pageEl.getBoundingClientRect()
  if (page.width === 0 || page.height === 0) return []

  const rects = Array.from(range.getClientRects())
    // Drop empty boxes and the huge ones that come from selecting
    // pdf.js's invisible end-of-page element.
    .filter((r) => r.width > 0.5 && r.height > 0.5 && r.height < page.height * 0.1)
    .map((r) => ({
      x: (r.left - page.left) / page.width,
      y: (r.top - page.top) / page.height,
      w: r.width / page.width,
      h: r.height / page.height,
    }))

  return mergeLines(rects)
}

// Joins boxes that sit on the same line and touch or overlap.
function mergeLines(rects: Rect[]): Rect[] {
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x)
  const merged: Rect[] = []

  for (const r of sorted) {
    const line = merged.find(
      (m) =>
        Math.abs(m.y + m.h / 2 - (r.y + r.h / 2)) < Math.min(m.h, r.h) / 2 &&
        r.x <= m.x + m.w + 0.015 &&
        m.x <= r.x + r.w + 0.015,
    )

    if (!line) {
      merged.push({ ...r })
      continue
    }

    const right = Math.max(line.x + line.w, r.x + r.w)
    const bottom = Math.max(line.y + line.h, r.y + r.h)
    line.x = Math.min(line.x, r.x)
    line.y = Math.min(line.y, r.y)
    line.w = right - line.x
    line.h = bottom - line.y
  }

  return merged
}

export function containsPoint(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
}
