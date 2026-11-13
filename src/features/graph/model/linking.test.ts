import { describe, expect, it } from 'vitest'
import { sampleGraph } from '@/data/sampleGraph'
import { canLink, orient } from './linking'

describe('canLink', () => {
  it('blocks self-links and links that already exist in either direction', () => {
    expect(canLink(sampleGraph, 'c1', 'c1')).toBe(false)
    expect(canLink(sampleGraph, 'e1', 'c1')).toBe(false)
    expect(canLink(sampleGraph, 'c1', 'e1')).toBe(false)
  })

  it('allows a new link between existing nodes', () => {
    expect(canLink(sampleGraph, 'e8', 'c4')).toBe(true)
    expect(canLink(sampleGraph, 'e8', 'missing')).toBe(false)
  })
})

describe('orient', () => {
  it('reads "A is backed by B" when drawing from A to B', () => {
    expect(orient(sampleGraph, 'c4', 'e8')).toEqual({ backed: 'c4', backer: 'e8' })
  })

  it('assumes the claim is backed when drawing from evidence onto a claim', () => {
    expect(orient(sampleGraph, 'e8', 'c3')).toEqual({ backed: 'c3', backer: 'e8' })
  })
})
