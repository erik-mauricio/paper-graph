// The interactive graph: React Flow canvas, selection, dragging nodes in and
// out of sections, keyboard delete, and the floating menus. Linking gestures
// live in useLinkGestures.ts. Rendered by pages/ResultsPage.tsx.
import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useConnection,
  useNodesState,
  useReactFlow,
  type OnBeforeDelete,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMemo, useRef, useState, type MouseEvent } from 'react'
import { getNeighborIds } from '@/features/graph/model/graphQueries'
import { NODE_HEIGHT, NODE_WIDTH, toFlowEdge, toFlowNodes, type ArgumentFlowEdge, type FlowNode } from '@/features/graph/model/layout'
import { canLink } from '@/features/graph/model/linking'
import type { GraphEditor } from '@/features/graph/editor/useGraphEditor'
import type { GraphNode } from '@shared/graph'
import ArgumentEdge from './ArgumentEdge'
import ArgumentNode from './ArgumentNode'
import GraphTip from '@/features/graph/ui/GraphTip'
import GraphToolbar from '@/features/graph/ui/GraphToolbar'
import LinkMenu from '@/features/graph/ui/LinkMenu'
import NodePanel from '@/features/graph/ui/NodePanel'
import RelationPicker from '@/features/graph/ui/RelationPicker'
import CanvasHint from './CanvasHint'
import type { AddNodeRequest, FocusNodeRequest } from './requests'
import { dropPosition, sectionAt } from './geometry'
import { GraphActionsContext, type GraphActions } from './graphActions'
import GraphMiniMap from './GraphMiniMap'
import Legend from './Legend'
import SectionNode from './SectionNode'
import { FIT_OPTIONS, useCamera } from './useCamera'
import { useLinkGestures } from './useLinkGestures'

const nodeTypes = { argument: ArgumentNode, section: SectionNode }
const edgeTypes = { argument: ArgumentEdge }

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
  const { screenToFlowPosition, getInternalNode } = useReactFlow()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
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

  const camera = useCamera({ positions, sections, wrapperRef, selectedId, focusRequest })

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

  function selectNode(id: string) {
    setSelectedId(id)
    setSelectedEdgeId(null)
    const node = graph.nodes.find((n) => n.id === id)
    if (node) onSelectNode?.(node)
  }

  function focusNode(id: string) {
    selectNode(id)
    camera.centerOn(id)
  }

  function clearSelection() {
    setSelectedId(null)
    setSelectedEdgeId(null)
  }

  const linking = useLinkGestures({ graph, positions, sections, onAddNode, toLocal, clearSelection })

  // ---- Dragging nodes in and out of sections ----

  function onNodeDragStop(_: unknown, __: unknown, dragged: FlowNode[]) {
    for (const n of dragged) {
      if (n.type === 'section') {
        editor.updateSection(n.id, { x: n.position.x, y: n.position.y })
        continue
      }
      const abs = getInternalNode(n.id)?.internals.positionAbsolute ?? n.position
      editor.moveNode(n.id, dropPosition(sections, abs))
    }
  }

  // ---- Clicks ----

  function onNodeClick(event: MouseEvent, node: FlowNode) {
    if (linking.onNodeClickInLinkMode(event, node)) return
    if (node.type === 'section') clearSelection()
    else selectNode(node.id)
  }

  // Double-click empty canvas to add a node right there.
  function onDoubleClick(event: MouseEvent<HTMLDivElement>) {
    if (!(event.target as Element).classList.contains('react-flow__pane')) return
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    onAddNode({
      position: { x: point.x - NODE_WIDTH / 2, y: point.y - NODE_HEIGHT / 2 },
      sectionId: sectionAt(sections, point)?.id ?? null,
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
    onPlusClick: linking.openMenu,
    onEditNode: (nodeId) => {
      const node = graph.nodes.find((n) => n.id === nodeId)
      if (node) onEditNode(node)
    },
    onDeleteNode: deleteNode,
    canLink: (from, to) => canLink(graph, from, to),
    linkSource: linking.linkSource,
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
            linking.cancelLinkMode()
          }}
          onNodeDragStop={onNodeDragStop}
          onConnect={linking.onConnect}
          onConnectEnd={linking.onConnectEnd}
          isValidConnection={linking.isValidConnection}
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
          {!selectedNode && <GraphMiniMap />}
          <Panel position="top-left" className="flex flex-col items-start gap-2">
            <GraphToolbar
              edited={editor.edited}
              onAddNode={() => onAddNode()}
              onAddSection={addSection}
              onRelayout={editor.relayout}
              onReset={() => {
                setSelectedId(null)
                editor.resetToAi()
                camera.fitAll()
              }}
            />
            <Legend />
          </Panel>

          <CanvasHint
            dragging={dragging}
            linkSourceText={linking.linkSource ? textOf(linking.linkSource) : null}
            panelOpen={Boolean(selectedNode)}
            onCancelLink={linking.cancelLinkMode}
          />

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

      {linking.menu && (
        <LinkMenu
          x={linking.menu.at.x}
          y={linking.menu.at.y}
          nodeText={textOf(linking.menu.nodeId)}
          onPick={(action) => linking.menu && linking.pickMenuAction(linking.menu.nodeId, action)}
          onClose={linking.closeMenu}
        />
      )}

      {linking.picker && (
        <RelationPicker
          x={linking.picker.at.x}
          y={linking.picker.at.y}
          backedText={textOf(linking.picker.backed)}
          backerText={textOf(linking.picker.backer)}
          onSwap={linking.swapPicker}
          // Stored supporter → supported.
          onPick={(relation) => linking.picker && editor.addEdge(linking.picker.backer, linking.picker.backed, relation)}
          onClose={linking.closePicker}
        />
      )}
    </div>
  )
}

export default GraphView
