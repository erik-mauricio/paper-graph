import { describe, expect, it } from 'vitest'
import type { GraphEdge, GraphNode, PaperGraph, Relation } from '@shared/graph'
import { sampleGraph } from '@/data/sampleGraph'
import { getClaimLabels } from './graphQueries'

const claim = (id: string): GraphNode => ({ id, type: 'claim', text: id })

// Builds a graph from claim ids and "from>to" links (from backs up to).
function graph(ids: string[], links: string[], relation: Relation = 'supports', extra: GraphNode[] = []): PaperGraph {
  const edges: GraphEdge[] = links.map((l, i) => {
    const [from, to] = l.split('>')
    return { id: `l${i}`, from, to, relation }
  })
  return { title: 't', nodes: [...ids.map(claim), ...extra], edges }
}

const labelsOf = (g: PaperGraph) => Object.fromEntries(getClaimLabels(g))

describe('getClaimLabels', () => {
  it('numbers main claims 1, 2, 3 in node order', () => {
    expect(labelsOf(graph(['a', 'b', 'c'], []))).toEqual({ a: '1', b: '2', c: '3' })
  })

  it('letters sub-claims under their parent, then alternates digits and letters', () => {
    const g = graph(['top', 'x', 'y', 'deep', 'deeper', 'other'], ['x>top', 'y>top', 'deep>x', 'deeper>deep'])
    expect(labelsOf(g)).toEqual({ top: '1', x: '1a', y: '1b', deep: '1a1', deeper: '1a1a', other: '2' })
  })

  it('returns claims in outline order', () => {
    const g = graph(['s2', 'm1', 'm2', 's1', 'ss'], ['s1>m1', 's2>m2', 'ss>s1'])
    expect([...getClaimLabels(g).values()]).toEqual(['1', '1a', '1a1', '2', '2a'])
  })

  it('ignores claims that challenge another claim', () => {
    expect(labelsOf(graph(['a', 'b'], ['b>a'], 'contradicts'))).toEqual({ a: '1', b: '2' })
  })

  it('gives evidence and notes no label', () => {
    const extra: GraphNode[] = [
      { id: 'e', type: 'evidence', text: 'e' },
      { id: 'n', type: 'note', text: 'n' },
    ]
    expect(labelsOf(graph(['a'], ['e>a', 'n>a'], 'supports', extra))).toEqual({ a: '1' })
  })

  it('numbers a sub-claim with two parents under the shallowest, lowest-numbered one', () => {
    expect(labelsOf(graph(['a', 'b', 'x'], ['x>b', 'x>a']))).toEqual({ a: '1', b: '2', x: '1a' })
    // Under main claim 2 (depth 1) rather than under 1a (depth 2).
    const g = graph(['a', 'b', 'mid', 'x'], ['mid>a', 'x>mid', 'x>b'])
    expect(labelsOf(g)).toEqual({ a: '1', b: '2', mid: '1a', x: '2a' })
  })

  it('stops at a loop below a main claim', () => {
    const g = graph(['top', 'p', 'q'], ['p>top', 'q>p', 'p>q'])
    expect(labelsOf(g)).toEqual({ top: '1', p: '1a', q: '1a1' })
  })

  it('makes the first claim of a loop with no main claim the next main claim', () => {
    const g = graph(['solo', 'p', 'q', 'r'], ['p>q', 'q>r', 'r>p'])
    expect(labelsOf(g)).toEqual({ solo: '1', p: '2', r: '2a', q: '2a1' })
  })

  it('treats a claim linked only to itself as a main claim', () => {
    expect(labelsOf(graph(['a'], ['a>a']))).toEqual({ a: '1' })
  })

  it('skips links to missing nodes', () => {
    expect(labelsOf(graph(['a'], ['a>gone']))).toEqual({ a: '1' })
  })

  it('continues aa, ab after z', () => {
    const subs = Array.from({ length: 28 }, (_, i) => `s${i}`)
    const labels = getClaimLabels(graph(['top', ...subs], subs.map((s) => `${s}>top`)))
    expect([labels.get('s0'), labels.get('s25'), labels.get('s26'), labels.get('s27')]).toEqual(['1a', '1z', '1aa', '1ab'])
  })

  it('numbers the sample graph', () => {
    expect(labelsOf(sampleGraph)).toEqual({ c1: '1', c2: '1a', c3: '2', c4: '3' })
  })
})
