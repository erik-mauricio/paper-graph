// Pure position math for the graph canvas (GraphView and useLinkGestures).
import type { Section } from '@shared/graph'
import { NODE_HEIGHT, NODE_WIDTH, type NodePosition } from '@/features/graph/model/layout'

type Point = { x: number; y: number }

// The smallest section containing a point on the canvas, if any.
export function sectionAt(sections: Section[], point: Point): Section | undefined {
  return sections
    .filter((s) => point.x >= s.x && point.x <= s.x + s.width && point.y >= s.y && point.y <= s.y + s.height)
    .sort((a, b) => a.width * a.height - b.width * b.height)[0]
}

// Where a node lands after a drag (`abs` is its top-left on the canvas): inside
// the section under its center, relative to that section, or loose on the canvas.
export function dropPosition(sections: Section[], abs: Point): NodePosition {
  const target = sectionAt(sections, { x: abs.x + NODE_WIDTH / 2, y: abs.y + NODE_HEIGHT / 2 })
  return target
    ? { x: abs.x - target.x, y: abs.y - target.y, sectionId: target.id }
    : { x: abs.x, y: abs.y, sectionId: null }
}

// Slides a new node's spot down until it doesn't cover any of the `taken` spots.
export function freeSpot(taken: Point[], start: Point): Point {
  const spot = { ...start }
  for (let tries = 0; tries < 30; tries++) {
    const hit = taken.some((p) => Math.abs(p.x - spot.x) < NODE_WIDTH && Math.abs(p.y - spot.y) < NODE_HEIGHT)
    if (!hit) break
    spot.y += NODE_HEIGHT + 16
  }
  return spot
}

export function truncate(text: string, max = 48): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
