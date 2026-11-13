import { describe, expect, it } from 'vitest'
import type { Section } from '@shared/graph'
import { NODE_HEIGHT, NODE_WIDTH } from '@/features/graph/model/layout'
import { dropPosition, freeSpot, sectionAt, truncate } from './geometry'

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

describe('truncate', () => {
  it('shortens long text with an ellipsis', () => {
    expect(truncate('abcdef', 4)).toBe('abc…')
    expect(truncate('abc', 4)).toBe('abc')
  })
})
