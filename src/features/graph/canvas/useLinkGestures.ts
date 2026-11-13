// Everything about drawing links with a node's "+": dragging it onto a node or
// empty space, its menu, "link to an existing node" mode, and the relation
// picker that follows. Used by GraphView.tsx.
//
// The rule: drawing from A to B means "A is backed by B" (see model/linking.ts).
import { useReactFlow, type Connection, type IsValidConnection, type OnConnectEnd } from '@xyflow/react'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { PaperGraph, Section } from '@shared/graph'
import { absolutePosition } from '@/features/graph/editor/editorState'
import { NODE_HEIGHT, NODE_WIDTH, type FlowNode, type Positions } from '@/features/graph/model/layout'
import { canLink, orient } from '@/features/graph/model/linking'
import type { LinkMenuAction } from '@/features/graph/ui/LinkMenu'
import type { AddNodeRequest } from './requests'
import { freeSpot, sectionAt } from './geometry'

type Point = { x: number; y: number }

// Space between a node and a new node created next to it.
const SIDE_GAP = 80

type Options = {
  graph: PaperGraph
  positions: Positions
  sections: Section[]
  onAddNode: (request?: AddNodeRequest) => void
  // Screen coordinates → pixels from the canvas's top-left (for floating menus).
  toLocal: (client: Point) => Point
  clearSelection: () => void
}

export function useLinkGestures({ graph, positions, sections, onAddNode, toLocal, clearSelection }: Options) {
  const { screenToFlowPosition } = useReactFlow()

  // The "+" menu, open next to a node.
  const [menu, setMenu] = useState<{ nodeId: string; at: Point } | null>(null)
  // A link waiting for the user to pick "backed by" / "challenged by".
  // `backed` is the claim side, `backer` the evidence side.
  const [picker, setPicker] = useState<{ backed: string; backer: string; at: Point } | null>(null)
  // "Link to an existing node" mode: the node the link starts from.
  const [linkSource, setLinkSource] = useState<string | null>(null)

  // Escape leaves link mode.
  useEffect(() => {
    if (!linkSource) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLinkSource(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [linkSource])

  // ---- Dragging a "+" ----

  const isValidConnection: IsValidConnection = (c) => canLink(graph, c.source, c.target)

  // onConnect runs just before onConnectEnd; remember the link so onConnectEnd
  // can open the relation picker where the pointer let go.
  const pendingLink = useRef<{ backed: string; backer: string } | null>(null)
  function onConnect(c: Connection) {
    // Dragged from the source's "+" onto the target: source is backed by target.
    pendingLink.current = orient(graph, c.source, c.target)
  }

  const onConnectEnd: OnConnectEnd = (event, state) => {
    const pointer = 'changedTouches' in event ? event.changedTouches[0] : event
    const client = { x: pointer.clientX, y: pointer.clientY }

    const link = pendingLink.current
    pendingLink.current = null
    if (link) {
      setPicker({ ...link, at: toLocal(client) })
      return
    }

    // Let go over empty space: make a new node there, already linked. From a
    // claim, the new node is evidence backing it up; from evidence or a note,
    // the new node is the claim it backs up.
    const fromId = state.fromNode?.id
    if (fromId && !state.toNode) {
      const drop = screenToFlowPosition(client)
      const fromClaim = graph.nodes.find((n) => n.id === fromId)?.type === 'claim'
      onAddNode({
        type: fromClaim ? 'evidence' : 'claim',
        position: { x: drop.x - NODE_WIDTH / 2, y: drop.y - NODE_HEIGHT / 2 },
        sectionId: sectionAt(sections, drop)?.id ?? null,
        link: { otherId: fromId, direction: fromClaim ? 'in' : 'out', relation: 'supports' },
      })
    }
  }

  // ---- The "+" menu ----

  function openMenu(nodeId: string, anchor: DOMRect) {
    setMenu({ nodeId, at: toLocal({ x: anchor.right + 6, y: anchor.top - 8 }) })
  }

  function pickMenuAction(nodeId: string, action: LinkMenuAction) {
    if (action === 'link-existing') {
      setLinkSource(nodeId)
      clearSelection()
      return
    }
    const pos = positions[nodeId] ? absolutePosition(positions[nodeId], sections) : { x: 0, y: 0 }
    const taken = graph.nodes.filter((n) => positions[n.id]).map((n) => absolutePosition(positions[n.id], sections))
    // Claim-first layout: evidence goes to the right, the claim it backs up to the left.
    const isClaim = action === 'claim-out'
    onAddNode({
      type: isClaim ? 'claim' : 'evidence',
      position: freeSpot(taken, {
        x: isClaim ? pos.x - NODE_WIDTH - SIDE_GAP : pos.x + NODE_WIDTH + SIDE_GAP,
        y: pos.y,
      }),
      sectionId: positions[nodeId]?.sectionId ?? null,
      link: {
        otherId: nodeId,
        direction: isClaim ? 'out' : 'in',
        relation: action === 'contradict-in' ? 'contradicts' : 'supports',
      },
    })
  }

  // ---- Link mode ----

  // In link mode, clicking a node finishes the link. Returns true if the click
  // was used for that (so it shouldn't also select the node).
  function onNodeClickInLinkMode(event: MouseEvent, node: FlowNode): boolean {
    if (!linkSource) return false
    if (node.type === 'argument' && canLink(graph, linkSource, node.id)) {
      setPicker({ ...orient(graph, linkSource, node.id), at: toLocal({ x: event.clientX, y: event.clientY }) })
      setLinkSource(null)
    }
    return true
  }

  return {
    menu,
    closeMenu: () => setMenu(null),
    openMenu,
    pickMenuAction,
    picker,
    closePicker: () => setPicker(null),
    swapPicker: () => setPicker((p) => (p ? { ...p, backed: p.backer, backer: p.backed } : p)),
    linkSource,
    cancelLinkMode: () => setLinkSource(null),
    isValidConnection,
    onConnect,
    onConnectEnd,
    onNodeClickInLinkMode,
  }
}
