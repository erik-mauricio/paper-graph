import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type IsValidConnection,
  type OnBeforeDelete,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getNeighborIds } from '../../lib/graph'
import { HIGHLIGHT_COLORS } from '../../lib/highlightColors'
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  toFlowEdge,
  toFlowNodes,
  type FlowNode,
  type NodePosition,
} from '../../lib/layout'
import type { GraphEditor } from '../../lib/useGraphEditor'
import type { GraphNode } from '../../types/graph'
import ArgumentNode from './ArgumentNode'
import GraphToolbar from './GraphToolbar'
import NodePanel from './NodePanel'
import RelationModal from './RelationModal'
import SectionNode from './SectionNode'
import { SectionActionsContext, type SectionActions } from './sectionActions'

const nodeTypes = { argument: ArgumentNode, section: SectionNode }
const FIT_OPTIONS = { padding: 0.15, maxZoom: 1 }
// Width of the floating details card on large screens, plus its margin.
const CARD_OFFSET = 332

// Asks the graph to select and center a node, e.g. one that was just added.
export type FocusNodeRequest = { id: string; nonce: number }

type GraphViewProps = {
  editor: GraphEditor
  // Called when the user picks a node (by clicking it or following a link).
  onSelectNode?: (node: GraphNode) => void
  onShowInPdf?: (node: GraphNode) => void
  onAddNode: () => void
  onEditNode: (node: GraphNode) => void
  focusRequest: FocusNodeRequest | null
}

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
  // A link the user just drew, waiting for them to pick supports/contradicts.
  const [pendingLink, setPendingLink] = useState<{ from: string; to: string } | null>(null)

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
  const shownEdges: Edge[] = graph.edges.map((edge) => {
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

  // ---- Dragging nodes in and out of sections ----

  function onNodeDragStop(_: unknown, __: unknown, dragged: FlowNode[]) {
    for (const n of dragged) {
      if (n.type === 'section') {
        editor.updateSection(n.id, { x: n.position.x, y: n.position.y })
        continue
      }

      const abs = getInternalNode(n.id)?.internals.positionAbsolute ?? n.position
      const center = { x: abs.x + NODE_WIDTH / 2, y: abs.y + NODE_HEIGHT / 2 }
      // The smallest section under the node's center, if any.
      const target = sections
        .filter(
          (s) =>
            center.x >= s.x && center.x <= s.x + s.width && center.y >= s.y && center.y <= s.y + s.height,
        )
        .sort((a, b) => a.width * a.height - b.width * b.height)[0]

      const position: NodePosition = target
        ? { x: abs.x - target.x, y: abs.y - target.y, sectionId: target.id }
        : { x: abs.x, y: abs.y, sectionId: null }
      editor.moveNode(n.id, position)
    }
  }

  // ---- Drawing links ----

  const isValidConnection: IsValidConnection = (c) =>
    c.source !== c.target &&
    graph.nodes.some((n) => n.id === c.source) &&
    graph.nodes.some((n) => n.id === c.target) &&
    !graph.edges.some(
      (e) => (e.from === c.source && e.to === c.target) || (e.from === c.target && e.to === c.source),
    )

  function onConnect(c: Connection) {
    setPendingLink({ from: c.source, to: c.target })
  }

  // ---- Deleting with the keyboard ----

  // React Flow would delete things itself; route it through the editor instead
  // so deletes are saved and can be undone.
  const onBeforeDelete: OnBeforeDelete<FlowNode> = async ({ nodes: gone, edges: goneEdges }) => {
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

  const sectionActions: SectionActions = {
    onRename: (id, name) => editor.updateSection(id, { name }),
    onColor: (id, color) => editor.updateSection(id, { color }),
    onDelete: (id) => editor.deleteItems({ sectionIds: [id] }),
    onResizeEnd: (id, box) => editor.resizeSection(id, box),
  }

  const textOf = (id: string) => graph.nodes.find((n) => n.id === id)?.text ?? ''

  return (
    <div ref={wrapperRef} className="relative h-full">
      <SectionActionsContext.Provider value={sectionActions}>
        <ReactFlow
          nodes={shownNodes}
          edges={shownEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => {
            if (node.type === 'section') {
              setSelectedId(null)
              setSelectedEdgeId(null)
            } else {
              selectNode(node.id)
            }
          }}
          onEdgeClick={(_, edge) => {
            setSelectedEdgeId(edge.id)
            setSelectedId(null)
          }}
          onPaneClick={() => {
            setSelectedId(null)
            setSelectedEdgeId(null)
          }}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onBeforeDelete={onBeforeDelete}
          deleteKeyCode={['Backspace', 'Delete']}
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
              onAddNode={onAddNode}
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
          {!selectedNode && (
            <Panel position="top-right" className="hidden sm:block">
              <span className="badge border-base-300 bg-base-100 text-base-content/70 shadow-sm">
                Click a node to see its quote and links
              </span>
            </Panel>
          )}
        </ReactFlow>
      </SectionActionsContext.Provider>

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
          onDelete={(id) => {
            editor.deleteItems({ nodeIds: [id] })
            setSelectedId(null)
          }}
          onSetSection={editor.setNodeSection}
          onSetRelation={editor.updateEdge}
          onRemoveLink={(edgeId) => editor.deleteItems({ edgeIds: [edgeId] })}
        />
      )}

      {pendingLink && (
        <RelationModal
          fromText={textOf(pendingLink.from)}
          toText={textOf(pendingLink.to)}
          onPick={(relation) => editor.addEdge(pendingLink.from, pendingLink.to, relation)}
          onClose={() => setPendingLink(null)}
        />
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="flex gap-3 rounded-field border border-base-300 bg-base-100/90 px-2.5 py-1.5 text-xs">
      <span className="flex items-center gap-1.5">
        <svg width="20" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="20" y2="3" stroke="var(--color-primary)" strokeWidth="2" />
        </svg>
        supports
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="20" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="20" y2="3" stroke="var(--color-error)" strokeWidth="2" strokeDasharray="5 3" />
        </svg>
        contradicts
      </span>
    </div>
  )
}

export default GraphView
