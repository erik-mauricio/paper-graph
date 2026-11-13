import { createContext } from 'react'
import type { Section } from '../../types/graph'

// What a section box can ask the canvas to do. React Flow only passes `data`
// to custom nodes, so the canvas provides these through context.
export type SectionActions = {
  onRename: (id: string, name: string) => void
  onColor: (id: string, color: Section['color']) => void
  onDelete: (id: string) => void
  onResizeEnd: (id: string, box: { x: number; y: number; width: number; height: number }) => void
}

export const SectionActionsContext = createContext<SectionActions | null>(null)
