import { describe, expect, it } from 'vitest'
import { sampleGraph } from '@/data/sampleGraph'
import { initialPositions, toFlowEdge, toFlowNodes } from './layout'

describe('initialPositions (claim-first)', () => {
  const pos = initialPositions(sampleGraph)

  it('puts each claim left of the evidence that backs it up', () => {
    for (const edge of sampleGraph.edges) {
      expect(pos[edge.to].x).toBeLessThan(pos[edge.from].x)
    }
  })

  it('puts methods in their own column, right of everything else', () => {
    const methods = sampleGraph.nodes.filter((n) => n.type === 'method').map((n) => n.id)
    const others = sampleGraph.nodes.filter((n) => n.type !== 'method').map((n) => n.id)
    const columns = new Set(methods.map((id) => pos[id].x))
    expect(columns.size).toBe(1)
    expect(Math.min(...methods.map((id) => pos[id].x))).toBeGreaterThan(Math.max(...others.map((id) => pos[id].x)))
  })

  it('puts unlinked evidence in the evidence column, below everything else', () => {
    // e8 has no links in the sample.
    const evidenceColumn = Math.min(...sampleGraph.edges.map((e) => pos[e.from].x))
    const lowest = Math.max(...Object.entries(pos).filter(([id]) => id !== 'e8').map(([, p]) => p.y))
    expect(pos.e8.x).toBe(evidenceColumn)
    expect(pos.e8.y).toBeGreaterThan(lowest)
  })
})

describe('toFlowEdge', () => {
  it('draws links claim → evidence, the reverse of how they are stored', () => {
    const edge = toFlowEdge({ id: 'l', from: 'e1', to: 'c1', relation: 'contradicts' })
    expect(edge).toMatchObject({ source: 'c1', target: 'e1', data: { relation: 'contradicts' } })
    expect(edge.style?.strokeDasharray).toBeDefined()
  })
})

describe('toFlowNodes', () => {
  it('lists sections first and gives nodes inside one a parent', () => {
    const positions = { ...initialPositions(sampleGraph), e1: { x: 10, y: 50, sectionId: 's' } }
    const section = { id: 's', name: 'S', color: 'blue' as const, x: 0, y: 0, width: 400, height: 300 }
    const nodes = toFlowNodes(sampleGraph, positions, [section])
    expect(nodes[0]).toMatchObject({ id: 's', type: 'section' })
    expect(nodes.find((n) => n.id === 'e1')).toMatchObject({ parentId: 's', position: { x: 10, y: 50 } })
  })
})
