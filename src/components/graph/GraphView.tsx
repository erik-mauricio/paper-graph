import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getNeighborIds } from '../../lib/graph'
import { NODE_HEIGHT, NODE_WIDTH, toFlow } from '../../lib/layout'
import type { GraphNode, PaperGraph } from '../../types/graph'
import ArgumentNode from './ArgumentNode'
import NodePanel from './NodePanel'

const nodeTypes = { argument: ArgumentNode }
const FIT_OPTIONS = { padding: 0.15, maxZoom: 1 }
// Width of the floating details card on large screens, plus its margin.
const CARD_OFFSET = 332

type GraphViewProps = {
  graph: PaperGraph
  // Called when the user picks a node (by clicking it or following a link).
  onSelectNode?: (node: GraphNode) => void
  onShowInPdf?: (node: GraphNode) => void
}

function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  )
}

function GraphCanvas({ graph, onSelectNode, onShowInPdf }: GraphViewProps) {
  const layout = useMemo(() => toFlow(graph), [graph])
  const [nodes, , onNodesChange] = useNodesState(layout.nodes)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { setCenter, fitView } = useReactFlow()
  const wrapperRef = useRef<HTMLDivElement>(null)

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

  // Dim everything not directly linked to the selected node.
  const shownNodes = nodes.map((n) => ({
    ...n,
    selected: n.id === selectedId,
    style: { opacity: neighbors && !neighbors.has(n.id) ? 0.25 : 1 },
  }))
  const shownEdges = layout.edges.map((e) => {
    const active = !selectedId || e.source === selectedId || e.target === selectedId
    return {
      ...e,
      // Thicken (not animate) active edges: animated edges render dashed,
      // which would read as "contradicts".
      style: {
        ...e.style,
        opacity: active ? 1 : 0.15,
        strokeWidth: selectedId && active ? 3 : 2,
      },
    }
  })

  const selectedNode = graph.nodes.find((n) => n.id === selectedId)

  function selectNode(id: string) {
    setSelectedId(id)
    const node = graph.nodes.find((n) => n.id === id)
    if (node) onSelectNode?.(node)
  }

  function focusNode(id: string) {
    selectNode(id)
    const target = nodes.find((n) => n.id === id)
    if (!target) return
    // On large screens the details card covers the right side, so center
    // the node in the space left of it.
    const shift = window.matchMedia('(min-width: 1024px)').matches ? CARD_OFFSET / 2 : 0
    setCenter(
      target.position.x + NODE_WIDTH / 2 + shift,
      target.position.y + NODE_HEIGHT / 2,
      { zoom: 1, duration: 400 },
    )
  }

  return (
    <div ref={wrapperRef} className="relative h-full">
      <ReactFlow
        nodes={shownNodes}
        edges={shownEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => selectNode(node.id)}
        onPaneClick={() => setSelectedId(null)}
        nodesConnectable={false}
        edgesFocusable={false}
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
            nodeColor={(n) =>
              graph.nodes.find((g) => g.id === n.id)?.type === 'claim'
                ? 'var(--color-primary)'
                : 'var(--color-base-300)'
            }
          />
        )}
        <Legend />
        {!selectedNode && (
          <Panel position="top-right" className="hidden sm:block">
            <span className="badge border-base-300 bg-base-100 text-base-content/70 shadow-sm">
              Click a node to see its quote and links
            </span>
          </Panel>
        )}
      </ReactFlow>

      {selectedNode && (
        <NodePanel
          graph={graph}
          node={selectedNode}
          onSelect={focusNode}
          onClose={() => setSelectedId(null)}
          onShowInPdf={onShowInPdf}
        />
      )}
    </div>
  )
}

function Legend() {
  return (
    <Panel
      position="top-left"
      className="flex gap-3 rounded-field border border-base-300 bg-base-100/90 px-2.5 py-1.5 text-xs"
    >
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
    </Panel>
  )
}

export default GraphView
