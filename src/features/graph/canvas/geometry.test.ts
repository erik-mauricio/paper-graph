import { describe, expect, it } from 'vitest'
import type { Section } from '@shared/graph'
import { NODE_HEIGHT, NODE_WIDTH } from '@/features/graph/model/layout'
import { dropPosition, freeSpot, keepClear, sectionAt, truncate } from './geometry'

const big: Section = { id: 'big', name: 'B', color: 'blue', x: 0, y: 0, width: 1000, height: 1000 }
const small: Section = { id: 'small', name: 'S', color: 'green', x: 100, y: 100, width: 400, height: 300 }

describe('sectionAt', () => {
  it('picks the smallest section under the point', () => {
    expect(sectionAt([big, small], { x: 200, y: 200 })?.id).toBe('small')
    expect(sectionAt([big, small], { x: 900, y: 900 })?.id).toBe('big')
    expect(sectionAt([small], { x: 0, y: 0 })).toBeUndefined()
  })
})

describe('dropPosition', () => {
  it('stores a position relative to the section under the node\'s center', () => {
    expect(dropPosition([small], { x: 150, y: 150 })).toEqual({ x: 50, y: 50, sectionId: 'small' })
  })

  it('leaves the node loose when its center is outside every section', () => {
    expect(dropPosition([small], { x: 2000, y: 0 })).toEqual({ x: 2000, y: 0, sectionId: null })
  })
})

describe('freeSpot', () => {
  it('moves down past nodes that would be covered', () => {
    const spot = freeSpot([{ x: 0, y: 0 }], { x: 10, y: 10 })
    expect(spot.x).toBe(10)
    expect(spot.y).toBeGreaterThanOrEqual(NODE_HEIGHT)
  })

  it('keeps the start when nothing is in the way', () => {
    expect(freeSpot([{ x: NODE_WIDTH * 3, y: 0 }], { x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })
})

describe('keepClear', () => {
  const bounds = { width: 1000, height: 800 }
  const card = (x: number, y: number) => ({ x, y, width: 260, height: 100 })
  const toolbar = { x: 10, y: 10, width: 300, height: 60 }
  const panel = { x: 670, y: 12, width: 320, height: 776 }

  it('leaves a card that covers nothing where it is', () => {
    expect(keepClear(card(350, 300), bounds, [toolbar, panel])).toEqual({ x: 350, y: 300 })
  })

  it('pulls a card back onto the canvas', () => {
    expect(keepClear(card(-50, 900), bounds, [])).toEqual({ x: 0, y: 700 })
  })

  it('moves a card off the toolbar to the nearest free side', () => {
    // Overlapping the toolbar's bottom edge a little: below it is closest.
    expect(keepClear(card(20, 50), bounds, [toolbar])).toEqual({ x: 20, y: 78 })
  })

  it('moves a card next to the details panel, not behind it', () => {
    expect(keepClear(card(600, 300), bounds, [panel])).toEqual({ x: 670 - 260 - 8, y: 300 })
  })

  it('skips sides that would leave the canvas', () => {
    // Left of the obstacle is off-canvas, so the card goes right of it.
    const obstacle = { x: 100, y: 0, width: 100, height: 800 }
    expect(keepClear(card(120, 300), bounds, [obstacle])).toEqual({ x: 208, y: 300 })
  })
})

describe('truncate', () => {
  it('shortens long text with an ellipsis', () => {
    expect(truncate('abcdef', 4)).toBe('abc…')
    expect(truncate('abc', 4)).toBe('abc')
  })
})
