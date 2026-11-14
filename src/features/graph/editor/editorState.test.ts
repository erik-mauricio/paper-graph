import { describe, expect, it } from 'vitest'
import type { GraphNode, PaperGraph } from '@shared/graph'
import { sampleGraph } from '@/data/sampleGraph'
import { NODE_WIDTH } from '@/features/graph/model/layout'
import * as edit from './editorState'

const start = () => edit.fromAi(sampleGraph)
const note = (id: string): GraphNode => ({ id, type: 'note', text: 'mine', origin: 'user' })
const sectionById = (s: edit.EditorState, id: string) => s.sections.find((sec) => sec.id === id)

describe('fromAi', () => {
  it('puts the method nodes in a "Methods" section right of the argument', () => {
    const s = start()
    const methods = sectionById(s, edit.METHODS_SECTION_ID)!
    expect(methods).toBeDefined()
    for (const id of ['m1', 'm2', 'm3']) expect(s.positions[id].sectionId).toBe(methods.id)

    const argumentRight = Math.max(
      ...sampleGraph.nodes.filter((n) => n.type !== 'method').map((n) => s.positions[n.id].x + NODE_WIDTH),
    )
    expect(methods.x).toBeGreaterThan(argumentRight)
  })

  it('makes no sections for a paper without methods', () => {
    const graph: PaperGraph = { ...sampleGraph, nodes: sampleGraph.nodes.filter((n) => n.type !== 'method') }
    expect(edit.fromAi(graph).sections).toEqual([])
  })
})

describe('addNode', () => {
  it('places a node at a given spot', () => {
    const s = edit.addNode(start(), note('u1'), null, { x: 500, y: 80 })
    expect(s.positions.u1).toEqual({ x: 500, y: 80, sectionId: null })
    expect(s.graph.nodes.at(-1)?.id).toBe('u1')
  })

  it('without a spot, stacks new nodes in a column right of the AI graph', () => {
    let s = edit.addNode(start(), note('u1'))
    s = edit.addNode(s, note('u2'))
    const aiRight = Math.max(...sampleGraph.nodes.map((n) => s.positions[n.id].x)) + NODE_WIDTH
    expect(s.positions.u1.x).toBeGreaterThan(aiRight)
    expect(s.positions.u2.x).toBe(s.positions.u1.x)
    expect(s.positions.u2.y).toBeGreaterThan(s.positions.u1.y)
  })

  it('inside a section, stores a relative position and grows the section to fit', () => {
    let s = start()
    const section = edit.makeSection(s, 's1', { x: 0, y: 0 })
    s = edit.addSection(s, section)
    s = edit.addNode(s, note('u1'), 's1', { x: section.x + 300, y: section.y + 250 })
    expect(s.positions.u1).toEqual({ x: 300, y: 250, sectionId: 's1' })
    expect(sectionById(s, 's1')!.width).toBeGreaterThanOrEqual(300 + NODE_WIDTH)
  })
})

describe('updateNode', () => {
  it('marks AI nodes as edited, but not the user\'s own', () => {
    let s = edit.addNode(start(), note('u1'))
    s = edit.updateNode(s, 'c1', { text: 'Changed' })
    s = edit.updateNode(s, 'u1', { text: 'Changed too' })
    expect(s.graph.nodes.find((n) => n.id === 'c1')).toMatchObject({ text: 'Changed', edited: true })
    expect(s.graph.nodes.find((n) => n.id === 'u1')?.edited).toBeUndefined()
  })
})

describe('setNodeSection', () => {
  it('moves a node into a section and back out at the same spot on screen', () => {
    let s = edit.addSection(start(), { id: 's1', name: 'S', color: 'blue', x: 1000, y: 1000, width: 400, height: 300 })
    s = edit.setNodeSection(s, 'e1', 's1')
    expect(s.positions.e1.sectionId).toBe('s1')
    const inside = s.positions.e1
    s = edit.setNodeSection(s, 'e1', null)
    expect(s.positions.e1).toEqual({ x: 1000 + inside.x, y: 1000 + inside.y, sectionId: null })
  })
})

describe('deleteItems', () => {
  it('removes a node together with its links', () => {
    const s = edit.deleteItems(start(), { nodeIds: ['c1'] })
    expect(s.graph.nodes.some((n) => n.id === 'c1')).toBe(false)
    expect(s.graph.edges.some((e) => e.from === 'c1' || e.to === 'c1')).toBe(false)
    expect(s.positions.c1).toBeUndefined()
  })

  it('keeps the nodes of a deleted section, at the same spot on screen', () => {
    let s = edit.addSection(start(), { id: 's1', name: 'S', color: 'blue', x: 100, y: 200, width: 400, height: 300 })
    s = edit.moveNode(s, 'e1', { x: 10, y: 50, sectionId: 's1' })
    s = edit.deleteItems(s, { sectionIds: ['s1'] })
    expect(sectionById(s, 's1')).toBeUndefined()
    expect(s.positions.e1).toEqual({ x: 110, y: 250, sectionId: null })
  })

  it('describes what was deleted', () => {
    expect(edit.deleteMessage({ nodeIds: ['a'], edgeIds: ['x', 'y'] })).toBe('Deleted 1 node, 2 links')
    expect(edit.deleteMessage({})).toBeNull()
  })
})

describe('resizeSection', () => {
  it('shifts nodes back when the left or top edge moves, so they stay put', () => {
    let s = edit.addSection(start(), { id: 's1', name: 'S', color: 'blue', x: 100, y: 100, width: 400, height: 300 })
    s = edit.moveNode(s, 'e1', { x: 50, y: 60, sectionId: 's1' })
    s = edit.resizeSection(s, 's1', { x: 80, y: 90, width: 420, height: 310 })
    expect(s.positions.e1).toEqual({ x: 70, y: 70, sectionId: 's1' })
    expect(sectionById(s, 's1')).toMatchObject({ x: 80, y: 90, width: 420, height: 310 })
  })
})

describe('relayout', () => {
  it('re-lays out loose nodes but leaves nodes in sections alone', () => {
    let s = edit.addSection(start(), { id: 's1', name: 'S', color: 'blue', x: 0, y: 0, width: 400, height: 300 })
    s = edit.moveNode(s, 'e1', { x: 20, y: 60, sectionId: 's1' })
    s = edit.moveNode(s, 'c1', { x: 9999, y: 9999, sectionId: null })
    s = edit.relayout(s)
    expect(s.positions.e1).toEqual({ x: 20, y: 60, sectionId: 's1' })
    expect(s.positions.c1.x).not.toBe(9999)
  })
})

describe('saving and loading', () => {
  it('round-trips a saved state', () => {
    const s = { ...edit.addNode(start(), note('u1')), edited: true }
    const loaded = edit.parseSaved(JSON.stringify(edit.toStored(s)), sampleGraph)
    expect(loaded).toEqual(s)
  })

  it('falls back to the AI graph for missing or broken data', () => {
    expect(edit.parseSaved(null, sampleGraph).graph).toBe(sampleGraph)
    expect(edit.parseSaved('{not json', sampleGraph).graph).toBe(sampleGraph)
  })

  it('mirrors version-1 (evidence-first) saves left-to-right', () => {
    const graph: PaperGraph = { title: 't', nodes: [], edges: [] }
    const v1 = {
      version: 1,
      graph,
      edited: true,
      positions: { a: { x: 0, y: 0, sectionId: null }, b: { x: 16, y: 50, sectionId: 's' } },
      sections: [{ id: 's', name: 'S', color: 'green', x: -40, y: 250, width: 320, height: 200 }],
    }
    const s = edit.parseSaved(JSON.stringify(v1), graph)
    expect(s.positions.a.x).toBe(-NODE_WIDTH)
    expect(s.sections[0].x).toBe(-(-40 + 320))
    expect(s.positions.b.x).toBe(320 - (16 + NODE_WIDTH))
  })
})
