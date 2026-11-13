import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useConnection,
  useNodesState,
  useReactFlow,
  type Connection,
  type IsValidConnection,
  type OnBeforeDelete,
  type OnConnectEnd,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { getNeighborIds } from '../../lib/graph'
import { HIGHLIGHT_COLORS } from '../../lib/highlightColors'
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  toFlowEdge,
  toFlowNodes,
  type ArgumentFlowEdge,
  type FlowNode,
  type NodePosition,
} from '../../lib/layout'
import type { GraphEditor } from '../../lib/useGraphEditor'
import type { GraphNode, NodeType, Relation } from '../../types/graph'
import ArgumentEdge from './ArgumentEdge'
import ArgumentNode from './ArgumentNode'
import GraphTip from './GraphTip'
import GraphToolbar from './GraphToolbar'
import LinkMenu, { type LinkMenuAction } from './LinkMenu'
import NodePanel from './NodePanel'
import RelationPicker from './RelationPicker'
import SectionNode from './SectionNode'
import { GraphActionsContext, type GraphActions } from './graphActions'

const nodeTypes = { argument: ArgumentNode, section: SectionNode }
const edgeTypes = { argument: ArgumentEdge }
const FIT_OPTIONS = { padding: 0.15, maxZoom: 1 }
// Width of the floating details card on large screens, plus its margin.
const CARD_OFFSET = 332
// Space between a node and a new node created next to it.
const SIDE_GAP = 80

// Asks the graph to select and center a node, e.g. one that was just added.
export type FocusNodeRequest = { id: string; nonce: number }

// A request for the add-node form: where to put the new node, and what to link it to.
export type AddNodeRequest = {
  type?: NodeType
  // Top-left corner on the canvas.
  position?: { x: number; y: number }
  sectionId?: string | null
  // 'in': the new node points at `otherId`. 'out': `otherId` points at the new node.
  link?: { otherId: string; direction: 'in' | 'out'; relation: Relation }
}

type GraphViewProps = {
  editor: GraphEditor
  // Called when the user picks a node (by clicking it or following a link).
  onSelectNode?: (node: GraphNode) => void
  onShowInPdf?: (node: GraphNode) => void
  onAddNode: (request?: AddNodeRequest) => void
  onEditNode: (node: GraphNode) => void
  focusRequest: FocusNodeRequest | null
}

type Point = { x: number; y: number }

function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  )
}

function GraphCanvas({
  editor,
  onSelectNode,
  onShowInPdf,
  onAddNode,
  onEditNode,
  focusRequest,
}: GraphViewProps) {
  const { graph, positions, sections } = editor
  const { setCenter, fitView, screenToFlowPosition, getInternalNode } = useReactFlow()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  // The "+" menu, open next to a node.
  const [menu, setMenu] = useState<{ nodeId: string; at: Point } | null>(null)
  // A link waiting for the user to pick "backed by" / "challenged by".
  // `backed` is the claim side, `backer` the evidence side.
  const [picker, setPicker] = useState<{ backed: string; backer: string; at: Point } | null>(null)
  // "Link to an existing node" mode: the node the link starts from.
  const [linkSource, setLinkSource] = useState<string | null>(null)
  // Whether a link is being dragged right now (for the hint banner).
  const dragging = useConnection((c) => c.inProgress)

  // React Flow keeps its own copy of the nodes so dragging stays smooth.
  // It's rebuilt whenever the saved graph changes (an edit, a drop, an undo).
  const built = useMemo(() => toFlowNodes(graph, positions, sections), [graph, positions, sections])
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(built)
  const [lastBuilt, setLastBuilt] = useState(built)
  if (built !== lastBuilt) {
    setLastBuilt(built)
    // Keep a section selected (and its resize handles showing) across the rebuild.
    setNodes((prev) =>
      built.map((n) =>
        n.type === 'section' ? { ...n, selected: prev.find((p) => p.id === n.id)?.selected } : n,
      ),
    )
  }

  // A newly added node (or one picked elsewhere) gets selected...
  const [handledFocus, setHandledFocus] = useState<number | null>(null)
  if (focusRequest && focusRequest.nonce !== handledFocus) {
    setHandledFocus(focusRequest.nonce)
    setSelectedId(focusRequest.id)
  }

  // Top-left corner of a node on the canvas (sections hold relative positions).
  const absolutePosition = useCallback(
    (id: string) => {
      const pos = positions[id]
      if (!pos) return null
      const section = sections.find((s) => s.id === pos.sectionId)
      return section ? { x: pos.x + section.x, y: pos.y + section.y } : { x: pos.x, y: pos.y }
    },
    [positions, sections],
  )

  const centerOn = useCallback(
    (id: string) => {
      const pos = absolutePosition(id)
      if (!pos) return
      // On large screens the details card covers the right side, so center
      // the node in the space left of it.
      const shift = window.matchMedia('(min-width: 1024px)').matches ? CARD_OFFSET / 2 : 0
      setCenter(pos.x + NODE_WIDTH / 2 + shift, pos.y + NODE_HEIGHT / 2, { zoom: 1, duration: 400 })
    },
    [absolutePosition, setCenter],
  )

  // ...and centered on screen.
  const centeredFocus = useRef<number | null>(null)
  useEffect(() => {
    if (!focusRequest || focusRequest.nonce === centeredFocus.current) return
    centeredFocus.current = focusRequest.nonce
    centerOn(focusRequest.id)
  }, [focusRequest, centerOn])

  // Refit when the canvas changes width a lot (e.g. the PDF opens or
  // closes), unless the user is looking at a specific node.
  const selectedRef = useRef(selectedId)
  useEffect(() => {
    selectedRef.current = selectedId
  }, [selectedId])
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    let lastWidth = el.clientWidth
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width
      if (width === 0 || Math.abs(width - lastWidth) < 80) return
      lastWidth = width
      if (!selectedRef.current) fitView({ ...FIT_OPTIONS, duration: 200 })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [fitView])

  // Escape leaves link mode.
  useEffect(() => {
    if (!linkSource) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLinkSource(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [linkSource])

  const neighbors = useMemo(
    () => (selectedId ? getNeighborIds(graph, selectedId) : null),
    [graph, selectedId],
  )

  // Dim everything not directly linked to the selected node. Sections never dim.
  const shownNodes = nodes.map((n) =>
    n.type === 'section'
      ? n
      : {
          ...n,
          selected: n.id === selectedId,
          style: { opacity: neighbors && !neighbors.has(n.id) ? 0.25 : 1 },
        },
  )
  const shownEdges: ArgumentFlowEdge[] = graph.edges.map((edge) => {
    const e = toFlowEdge(edge)
    const active = !selectedId || e.source === selectedId || e.target === selectedId
    const picked = e.id === selectedEdgeId
    return {
      ...e,
      selected: picked,
      // Thicken (not animate) active edges: animated edges render dashed,
      // which would read as "contradicts".
      style: {
        ...e.style,
        opacity: active ? 1 : 0.15,
        strokeWidth: picked ? 4 : selectedId && active ? 3 : 2,
      },
    }
  })

  const selectedNode = graph.nodes.find((n) => n.id === selectedId)
  const textOf = (id: string) => graph.nodes.find((n) => n.id === id)?.text ?? ''

  // ---- Helpers ----

  // Screen coordinates -> pixels from the canvas's top-left (for floating menus).
  function toLocal(client: Point): Point {
    const box = wrapperRef.current?.getBoundingClientRect()
    return box ? { x: client.x - box.left, y: client.y - box.top } : client
  }

  // The smallest section containing a point on the canvas, if any.
  function sectionAt(point: Point) {
    return sections
      .filter(
        (s) => point.x >= s.x && point.x <= s.x + s.width && point.y >= s.y && point.y <= s.y + s.height,
      )
      .sort((a, b) => a.width * a.height - b.width * b.height)[0]
  }

  // Slides a new node's spot down until it doesn't cover another node.
  function freeSpot(start: Point): Point {
    const taken = graph.nodes.map((n) => absolutePosition(n.id)).filter((p): p is Point => Boolean(p))
    const spot = { ...start }
    for (let tries = 0; tries < 30; tries++) {
      const hit = taken.some(
        (p) => Math.abs(p.x - spot.x) < NODE_WIDTH && Math.abs(p.y - spot.y) < NODE_HEIGHT,
      )
      if (!hit) break
      spot.y += NODE_HEIGHT + 16
    }
    return spot
  }

  const canLink = useCallback(
    (from: string, to: string) =>
      from !== to &&
      graph.nodes.some((n) => n.id === from) &&
      graph.nodes.some((n) => n.id === to) &&
      !graph.edges.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from)),
    [graph],
  )

  // Drawing from A to B means "A is backed by B". But if A is evidence (or a
  // note) and B is a claim, the user almost certainly means the claim is the
  // one being backed up, so start with that. The picker can swap it.
  function orient(a: string, b: string) {
    const typeOf = (id: string) => graph.nodes.find((n) => n.id === id)?.type
    return typeOf(a) !== 'claim' && typeOf(b) === 'claim'
      ? { backed: b, backer: a }
      : { backed: a, backer: b }
  }

  function selectNode(id: string) {
    setSelectedId(id)
    setSelectedEdgeId(null)
    const node = graph.nodes.find((n) => n.id === id)
    if (node) onSelectNode?.(node)
  }

  function focusNode(id: string) {
    selectNode(id)
    centerOn(id)
  }

  function clearSelection() {
    setSelectedId(null)
    setSelectedEdgeId(null)
  }

  // ---- Dragging nodes in and out of sections ----

  function onNodeDragStop(_: unknown, __: unknown, dragged: FlowNode[]) {
    for (const n of dragged) {
      if (n.type === 'section') {
        editor.updateSection(n.id, { x: n.position.x, y: n.position.y })
        continue
      }
      const abs = getInternalNode(n.id)?.internals.positionAbsolute ?? n.position
      const target = sectionAt({ x: abs.x + NODE_WIDTH / 2, y: abs.y + NODE_HEIGHT / 2 })
      const position: NodePosition = target
        ? { x: abs.x - target.x, y: abs.y - target.y, sectionId: target.id }
        : { x: abs.x, y: abs.y, sectionId: null }
      editor.moveNode(n.id, position)
    }
  }

  // ---- Drawing links by dragging a "+" ----

  const isValidConnection: IsValidConnection = (c) => canLink(c.source, c.target)

  // onConnect runs just before onConnectEnd; remember the link so onConnectEnd
  // can open the relation picker where the pointer let go.
  const pendingLink = useRef<{ backed: string; backer: string } | null>(null)
  function onConnect(c: Connection) {
    // Dragged from the source's "+" onto the target: source is backed by target.
    pendingLink.current = orient(c.source, c.target)
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
        sectionId: sectionAt(drop)?.id ?? null,
        link: { otherId: fromId, direction: fromClaim ? 'in' : 'out', relation: 'supports' },
      })
    }
  }

  // ---- The "+" menu ----

  function pickMenuAction(nodeId: string, action: LinkMenuAction) {
    if (action === 'link-existing') {
      setLinkSource(nodeId)
      clearSelection()
      return
    }
    const pos = absolutePosition(nodeId) ?? { x: 0, y: 0 }
    const sectionId = positions[nodeId]?.sectionId ?? null
    // Claim-first layout: evidence goes to the right, the claim it backs up to the left.
    const isClaim = action === 'claim-out'
    onAddNode({
      type: isClaim ? 'claim' : 'evidence',
      position: freeSpot({ x: isClaim ? pos.x - NODE_WIDTH - SIDE_GAP : pos.x + NODE_WIDTH + SIDE_GAP, y: pos.y }),
      sectionId,
      link: {
        otherId: nodeId,
        direction: isClaim ? 'out' : 'in',
        relation: action === 'contradict-in' ? 'contradicts' : 'supports',
      },
    })
  }

  // ---- Clicks ----

  function onNodeClick(event: MouseEvent, node: FlowNode) {
    // In link mode, clicking a node finishes the link.
    if (linkSource) {
      if (node.type === 'argument' && canLink(linkSource, node.id)) {
        setPicker({ ...orient(linkSource, node.id), at: toLocal({ x: event.clientX, y: event.clientY }) })
        setLinkSource(null)
      }
      return
    }
    if (node.type === 'section') clearSelection()
    else selectNode(node.id)
  }

  // Double-click empty canvas to add a node right there.
  function onDoubleClick(event: MouseEvent<HTMLDivElement>) {
    if (!(event.target as Element).classList.contains('react-flow__pane')) return
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    onAddNode({
      position: { x: point.x - NODE_WIDTH / 2, y: point.y - NODE_HEIGHT / 2 },
      sectionId: sectionAt(point)?.id ?? null,
    })
  }

  // ---- Deleting with the keyboard ----

  // React Flow would delete things itself; route it through the editor instead
  // so deletes are saved and can be undone.
  const onBeforeDelete: OnBeforeDelete<FlowNode, ArgumentFlowEdge> = async ({
    nodes: gone,
    edges: goneEdges,
  }) => {
    const sectionIds = gone.filter((n) => n.type === 'section').map((n) => n.id)
    // React Flow also lists the children of a deleted section; keep those.
    const nodeIds = gone.filter((n) => n.type === 'argument' && n.selected).map((n) => n.id)
    const deletedNodes = new Set(nodeIds)
    // Links attached to deleted nodes go anyway; only count the ones picked on their own.
    const edgeIds = goneEdges
      .filter((e) => !deletedNodes.has(e.source) && !deletedNodes.has(e.target))
      .map((e) => e.id)

    editor.deleteItems({ nodeIds, edgeIds, sectionIds })
    if (selectedId && deletedNodes.has(selectedId)) setSelectedId(null)
    setSelectedEdgeId(null)
    return false
  }

  // ---- Toolbar ----

  function addSection() {
    const box = wrapperRef.current?.getBoundingClientRect()
    if (!box) return
    const center = screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 })
    editor.addSection(center)
  }

  function deleteNode(id: string) {
    editor.deleteItems({ nodeIds: [id] })
    if (selectedId === id) setSelectedId(null)
  }

  const actions: GraphActions = {
    onRenameSection: (id, name) => editor.updateSection(id, { name }),
    onColorSection: (id, color) => editor.updateSection(id, { color }),
    onDeleteSection: (id) => editor.deleteItems({ sectionIds: [id] }),
    onResizeSectionEnd: (id, box) => editor.resizeSection(id, box),
    onPlusClick: (nodeId, anchor) =>
      setMenu({ nodeId, at: toLocal({ x: anchor.right + 6, y: anchor.top - 8 }) }),
    onEditNode: (nodeId) => {
      const node = graph.nodes.find((n) => n.id === nodeId)
      if (node) onEditNode(node)
    },
    onDeleteNode: deleteNode,
    canLink,
    linkSource,
    onSetRelation: editor.updateEdge,
    onRemoveLink: (edgeId) => {
      editor.deleteItems({ edgeIds: [edgeId] })
      setSelectedEdgeId(null)
    },
  }

  return (
    <div ref={wrapperRef} className="relative h-full" onDoubleClick={onDoubleClick}>
      <GraphActionsContext.Provider value={actions}>
        <ReactFlow
          nodes={shownNodes}
          edges={shownEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={(_, node) => {
            if (node.type === 'argument') actions.onEditNode(node.id)
          }}
          onEdgeClick={(_, edge) => {
            setSelectedEdgeId(edge.id)
            setSelectedId(null)
          }}
          onPaneClick={() => {
            clearSelection()
            setLinkSource(null)
          }}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          isValidConnection={isValidConnection}
          // A click on "+" opens its menu; only a real drag starts a link.
          connectOnClick={false}
          connectionDragThreshold={5}
          connectionLineStyle={{ stroke: 'var(--color-primary)', strokeWidth: 2 }}
          onBeforeDelete={onBeforeDelete}
          deleteKeyCode={['Backspace', 'Delete']}
          // Double-click adds a node instead of zooming.
          zoomOnDoubleClick={false}
          // Keep sections behind the nodes even while selected.
          elevateNodesOnSelect={false}
          fitView
          fitViewOptions={FIT_OPTIONS}
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} />
          <Controls showInteractive={false} />
          {!selectedNode && (
            <MiniMap
              className="hidden! sm:block!"
              pannable
              zoomable
              nodeColor={(n) => {
                const node = n as FlowNode
                if (node.type === 'section') return HIGHLIGHT_COLORS[node.data.section.color].fill
                const type = node.data.node.type
                if (type === 'claim') return 'var(--color-primary)'
                if (type === 'note') return 'var(--color-accent)'
                return 'var(--color-secondary)'
              }}
            />
          )}
          <Panel position="top-left" className="flex flex-col items-start gap-2">
            <GraphToolbar
              edited={editor.edited}
              onAddNode={() => onAddNode()}
              onAddSection={addSection}
              onRelayout={editor.relayout}
              onReset={() => {
                setSelectedId(null)
                editor.resetToAi()
                fitView({ ...FIT_OPTIONS, duration: 300 })
              }}
            />
            <Legend />
          </Panel>

          {dragging || linkSource ? (
            <Panel position="top-center">
              <div role="status" className="alert alert-horizontal py-1.5 text-sm shadow-md">
                {linkSource ? (
                  <>
                    <span>
                      Click the node that backs up or challenges{' '}
                      <strong>“{truncate(textOf(linkSource))}”</strong>
                    </span>
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => setLinkSource(null)}>
                      Cancel <kbd className="kbd kbd-xs">Esc</kbd>
                    </button>
                  </>
                ) : (
                  <span>Drop on a node to link it · drop on empty space to create a new one</span>
                )}
              </div>
            </Panel>
          ) : (
            !selectedNode && (
              <Panel position="top-right" className="hidden sm:block">
                <span className="badge border-base-300 bg-base-100 text-base-content/70 shadow-sm">
                  Click a node to see its quote and links
                </span>
              </Panel>
            )
          )}

          <Panel position="bottom-center" className="px-2">
            <GraphTip />
          </Panel>
        </ReactFlow>
      </GraphActionsContext.Provider>

      {selectedNode && (
        <NodePanel
          graph={graph}
          node={selectedNode}
          sections={sections}
          sectionId={positions[selectedNode.id]?.sectionId ?? null}
          onSelect={focusNode}
          onClose={() => setSelectedId(null)}
          onShowInPdf={onShowInPdf}
          onEdit={onEditNode}
          onDelete={deleteNode}
          onSetSection={editor.setNodeSection}
          onSetRelation={editor.updateEdge}
          onRemoveLink={(edgeId) => editor.deleteItems({ edgeIds: [edgeId] })}
        />
      )}

      {menu && (
        <LinkMenu
          x={menu.at.x}
          y={menu.at.y}
          nodeText={textOf(menu.nodeId)}
          onPick={(action) => pickMenuAction(menu.nodeId, action)}
          onClose={() => setMenu(null)}
        />
      )}

      {picker && (
        <RelationPicker
          x={picker.at.x}
          y={picker.at.y}
          backedText={textOf(picker.backed)}
          backerText={textOf(picker.backer)}
          onSwap={() => setPicker({ ...picker, backed: picker.backer, backer: picker.backed })}
          // Stored supporter → supported.
          onPick={(relation) => editor.addEdge(picker.backer, picker.backed, relation)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}

function truncate(text: string, max = 48): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

// Arrows run claim → evidence: "this claim is backed by / challenged by that".
function Legend() {
  return (
    <div className="flex gap-3 rounded-field border border-base-300 bg-base-100/90 px-2.5 py-1.5 text-xs">
      <span className="flex items-center gap-1.5">
        <svg width="24" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="19" y2="4" stroke="var(--color-primary)" strokeWidth="2" />
          <path d="M18 0.5 L24 4 L18 7.5 Z" fill="var(--color-primary)" />
        </svg>
        backed by
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="24" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="19" y2="4" stroke="var(--color-error)" strokeWidth="2" strokeDasharray="4 3" />
          <path d="M18 0.5 L24 4 L18 7.5 Z" fill="var(--color-error)" />
        </svg>
        challenged by
      </span>
    </div>
  )
}

export default GraphView
