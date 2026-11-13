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
import { useMemo, useState } from 'react'
import { getNeighborIds } from '../../lib/graph'
import { NODE_HEIGHT, NODE_WIDTH, toFlow } from '../../lib/layout'
import type { PaperGraph } from '../../types/graph'
import ArgumentNode from './ArgumentNode'
import NodePanel from './NodePanel'

const nodeTypes = { argument: ArgumentNode }

type GraphViewProps = {
  graph: PaperGraph
}

function GraphView({ graph }: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas graph={graph} />
    </ReactFlowProvider>
  )
}

function GraphCanvas({ graph }: GraphViewProps) {
  const layout = useMemo(() => toFlow(graph), [graph])
  const [nodes, , onNodesChange] = useNodesState(layout.nodes)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { setCenter } = useReactFlow()

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

  function focusNode(id: string) {
    setSelectedId(id)
    const target = nodes.find((n) => n.id === id)
    if (target) {
      setCenter(
        target.position.x + NODE_WIDTH / 2,
        target.position.y + NODE_HEIGHT / 2,
        { zoom: 1, duration: 400 },
      )
    }
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={shownNodes}
          edges={shownEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          nodesConnectable={false}
          edgesFocusable={false}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} />
          <Controls showInteractive={false} />
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
          <Legend />
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodePanel
          graph={graph}
          node={selectedNode}
          onSelect={focusNode}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

function Legend() {
  return (
    <Panel
      position="top-left"
      className="flex flex-wrap gap-x-4 gap-y-1 rounded-field border border-base-300 bg-base-100/90 px-3 py-2 text-xs"
    >
      <span className="flex items-center gap-1.5">
        <svg width="24" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="24" y2="3" stroke="var(--color-primary)" strokeWidth="2" />
        </svg>
        supports
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="24" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="24" y2="3" stroke="var(--color-error)" strokeWidth="2" strokeDasharray="6 4" />
        </svg>
        contradicts
      </span>
      <span className="hidden text-base-content/60 sm:inline">Click a node to trace its links</span>
    </Panel>
  )
}

export default GraphView
