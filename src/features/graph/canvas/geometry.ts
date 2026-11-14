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

export type Box = { x: number; y: number; width: number; height: number }

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

// Where a locked card should sit: inside `bounds` (the canvas, from 0,0) and off
// every obstacle (the toolbar, the details panel). When the card covers an
// obstacle it moves to whichever side of it is closest and still on the canvas.
export function keepClear(
  card: Box,
  bounds: { width: number; height: number },
  obstacles: Box[],
  gap = 8,
): Point {
  const inside = (p: Point) =>
    p.x >= 0 && p.y >= 0 && p.x + card.width <= bounds.width && p.y + card.height <= bounds.height
  let spot = {
    x: Math.max(0, Math.min(card.x, bounds.width - card.width)),
    y: Math.max(0, Math.min(card.y, bounds.height - card.height)),
  }

  for (const o of obstacles) {
    if (!overlaps({ ...card, ...spot }, o)) continue
    const moves = [
      { x: o.x - card.width - gap, y: spot.y },
      { x: o.x + o.width + gap, y: spot.y },
      { x: spot.x, y: o.y - card.height - gap },
      { x: spot.x, y: o.y + o.height + gap },
    ].filter(inside)
    const distance = (p: Point) => Math.abs(p.x - spot.x) + Math.abs(p.y - spot.y)
    const best = moves.sort((a, b) => distance(a) - distance(b))[0]
    if (best) spot = best
  }
  return spot
}

export function truncate(text: string, max = 48): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
