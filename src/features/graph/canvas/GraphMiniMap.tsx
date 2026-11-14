// The graph overview in the corner. Used by GraphView.tsx.
import { MiniMap } from '@xyflow/react'
import type { FlowNode } from '@/features/graph/model/layout'
import { HIGHLIGHT_COLORS } from '@/features/pdf/highlightColors'

// The small overview in the corner, colored like the graph:
// claims blue, evidence ochre, methods green, notes plum, sections in their own color.
function GraphMiniMap() {
  return (
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
        if (type === 'method') return 'var(--color-success)'
        return 'var(--color-secondary)'
      }}
    />
  )
}

export default GraphMiniMap
